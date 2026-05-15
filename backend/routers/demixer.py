from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import sys
import io
import os
import json
import numpy as np
import soundfile as sf
import httpx
from pathlib import Path

COLAB_API_URL = os.getenv("COLAB_API_URL", "").rstrip("/")

# editor.py lives in backend/modules/demixer/ — add that directory to path once at import time
sys.path.insert(0, str(Path(__file__).parent.parent / "modules" / "demixer"))
from editor import load_audio, pitch_shift_audio, change_timbre_simple

from database import User, DemixJob, Stem, DemixMix, get_session, engine
from auth import get_current_user
import storage
from replicate_client import call_demucs

router = APIRouter(prefix="/demixer", tags=["demixer"])


# ── Background task: Replicate Demucs → 4 stems → S3 ────────────────────────

async def _run_separation(job_id: str, s3_key: str, filename: str, export_format: str = "wav"):
    with Session(engine) as session:
        job = session.get(DemixJob, job_id)
        if not job:
            return
        job.status = "processing"
        job.updated_at = datetime.utcnow()
        session.add(job)
        session.commit()

    try:
        # Pass Replicate a presigned S3 URL — it fetches the file directly
        audio_url = storage.get_presigned_url(s3_key)

        # Replicate Demucs → {"vocals": url, "drums": url, "bass": url, "other": url}
        stem_urls = await call_demucs(audio_url, model_name="htdemucs")

        # Download each stem from Replicate and store permanently in S3
        # htdemucs returns guitar/piano as null — skip any None URLs
        uploaded: dict = {}  # stem_type -> s3_key
        async with httpx.AsyncClient(timeout=120.0) as client:
            for stem_type, url in stem_urls.items():
                if not url:
                    continue
                resp = await client.get(url)
                resp.raise_for_status()
                stem_s3_key = f"stems/{job_id}/{stem_type}.wav"
                storage.upload_bytes(resp.content, stem_s3_key, "audio/wav")
                uploaded[stem_type] = stem_s3_key

        with Session(engine) as session:
            for stem_type, stem_s3_key in uploaded.items():
                session.add(Stem(
                    job_id=job_id,
                    stem_type=stem_type,
                    original_s3_key=stem_s3_key,
                ))
            job = session.get(DemixJob, job_id)
            job.status = "completed"
            job.updated_at = datetime.utcnow()
            session.add(job)
            session.commit()

    except Exception as exc:
        with Session(engine) as session:
            job = session.get(DemixJob, job_id)
            if job:
                job.status = "failed"
                job.error_message = str(exc)
                job.updated_at = datetime.utcnow()
                session.add(job)
                session.commit()


# ── Background task: mix via Colab GPU (if COLAB_API_URL set) or local librosa ─

async def _run_mix(job_id: str, mix_id: str, export_format: str = "wav"):
    with Session(engine) as session:
        stems = session.exec(select(Stem).where(Stem.job_id == job_id)).all()
        stem_records = [
            {
                "s3_key":          s.modified_s3_key or s.original_s3_key,
                "pitch_shift":     s.pitch_shift,
                "timbre_strength": s.timbre_strength,
                "volume":          s.volume,
                "is_muted":        s.is_muted,
            }
            for s in stems
        ]

    try:
        mix_wav_bytes: bytes

        if COLAB_API_URL:
            # ── Colab GPU path ─────────────────────────────────────────
            # Generate presigned S3 URLs so Colab can download stems directly
            stems_payload = [
                {
                    "url":    storage.get_presigned_url(rec["s3_key"]),
                    "pitch":  float(rec["pitch_shift"]),
                    "timbre": float(rec["timbre_strength"]),
                    "volume": float(rec["volume"]),
                    "muted":  bool(rec["is_muted"]),
                }
                for rec in stem_records
            ]
            async with httpx.AsyncClient(timeout=600.0) as client:
                resp = await client.post(
                    f"{COLAB_API_URL}/process-and-mix",
                    data={"stems_json": json.dumps(stems_payload)},
                )
                resp.raise_for_status()
                mix_wav_bytes = resp.content

        else:
            # ── Local librosa fallback ─────────────────────────────────
            arrays = []
            sr_final = 44100

            for rec in stem_records:
                if rec["is_muted"]:
                    continue

                data = storage.download_bytes(rec["s3_key"])
                y, sr = load_audio(io.BytesIO(data))
                sr_final = sr

                if rec["pitch_shift"] != 0.0:
                    y = pitch_shift_audio(y, sr, rec["pitch_shift"])
                if rec["timbre_strength"] != 1.0:
                    y = change_timbre_simple(y, rec["timbre_strength"])

                if y.ndim == 2:
                    y = y.mean(axis=1)

                arrays.append(y.astype(np.float32) * float(rec["volume"]))

            if not arrays:
                raise RuntimeError("No unmuted stems to mix")

            max_len = max(len(a) for a in arrays)
            mix = np.zeros(max_len, dtype=np.float32)
            for a in arrays:
                mix[: len(a)] += a

            peak = float(np.max(np.abs(mix)))
            if peak > 0:
                mix = mix / peak * 0.98

            buf = io.BytesIO()
            sf.write(buf, mix, sr_final, format="WAV")
            mix_wav_bytes = buf.getvalue()

        # ── Common: upload result to S3 and update DB ──────────────────
        mix_s3_key = f"mixes/{job_id}/mix_{mix_id}.wav"
        storage.upload_bytes(mix_wav_bytes, mix_s3_key, "audio/wav")

        with Session(engine) as session:
            record = session.get(DemixMix, mix_id)
            if record:
                record.output_s3_key = mix_s3_key
                session.add(record)
                session.commit()

    except Exception:
        with Session(engine) as session:
            record = session.get(DemixMix, mix_id)
            if record:
                session.delete(record)
                session.commit()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/jobs", summary="Upload audio and start stem separation")
async def create_demix_job(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    content = await audio_file.read()
    filename = audio_file.filename or "upload.wav"
    song_name = filename.rsplit(".", 1)[0]

    job = DemixJob(
        user_id=current_user.id,
        original_file_name=filename,
        original_s3_key="",
        song_name=song_name,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    s3_key = f"uploads/{current_user.id}/{job.id}/{filename}"
    storage.upload_bytes(content, s3_key, storage.content_type_for(filename))

    job.original_s3_key = s3_key
    session.add(job)
    session.commit()

    export_format = current_user.export_format or "wav"
    background_tasks.add_task(_run_separation, job.id, s3_key, filename, export_format)

    return {"job_id": job.id, "status": "pending", "song_name": song_name}


@router.get("/jobs/{job_id}", summary="Poll job status and get stems")
def get_demix_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(DemixJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    stems = session.exec(select(Stem).where(Stem.job_id == job_id)).all()
    stem_data = []
    for s in stems:
        active_key = s.modified_s3_key or s.original_s3_key
        stem_data.append({
            "id":               s.id,
            "stem_type":        s.stem_type,
            "pitch_shift":      s.pitch_shift,
            "timbre_strength":  s.timbre_strength,
            "volume":           s.volume,
            "is_muted":         s.is_muted,
            "download_url":     storage.get_presigned_url(active_key) if job.status == "completed" else None,
        })

    mixes = session.exec(
        select(DemixMix).where(DemixMix.job_id == job_id).order_by(DemixMix.created_at.desc())
    ).all()
    latest_mix = mixes[0] if mixes else None

    # Only generate a presigned URL if the mix output actually exists in S3
    mix_ready = latest_mix and latest_mix.output_s3_key not in ("", "pending")
    latest_mix_url = storage.get_presigned_url(latest_mix.output_s3_key) if mix_ready else None

    original_url = (
        storage.get_presigned_url(job.original_s3_key)
        if job.original_s3_key and job.status == "completed"
        else None
    )

    return {
        "id":             job.id,
        "status":         job.status,
        "song_name":      job.song_name,
        "error_message":  job.error_message,
        "created_at":     job.created_at.isoformat(),
        "stems":          stem_data,
        "latest_mix_url": latest_mix_url,
        "original_url":   original_url,
    }


@router.delete("/jobs/{job_id}", summary="Delete a demix job and all its data")
def delete_demix_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(DemixJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    stems = session.exec(select(Stem).where(Stem.job_id == job_id)).all()
    mixes = session.exec(select(DemixMix).where(DemixMix.job_id == job_id)).all()

    try:
        if job.original_s3_key:
            storage.delete_object(job.original_s3_key)
    except Exception:
        pass
    for s in stems:
        try: storage.delete_object(s.original_s3_key)
        except Exception: pass
        if s.modified_s3_key:
            try: storage.delete_object(s.modified_s3_key)
            except Exception: pass
    for m in mixes:
        try: storage.delete_object(m.output_s3_key)
        except Exception: pass

    for s in stems:
        session.delete(s)
    for m in mixes:
        session.delete(m)
    session.delete(job)
    session.commit()

    return {"deleted": True, "job_id": job_id}


class StemEditBody(BaseModel):
    pitch_shift:     Optional[float] = None
    timbre_strength: Optional[float] = None
    volume:          Optional[float] = None
    is_muted:        Optional[bool]  = None


@router.put("/stems/{stem_id}", summary="Update pitch/timbre/volume/mute (persisted in DB)")
def edit_stem(
    stem_id: str,
    body: StemEditBody,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    stem = session.get(Stem, stem_id)
    if not stem:
        raise HTTPException(status_code=404, detail="Stem not found")

    job = session.get(DemixJob, stem.job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your stem")

    if body.pitch_shift     is not None: stem.pitch_shift     = body.pitch_shift
    if body.timbre_strength is not None: stem.timbre_strength = body.timbre_strength
    if body.volume          is not None: stem.volume          = body.volume
    if body.is_muted        is not None: stem.is_muted        = body.is_muted
    stem.updated_at = datetime.utcnow()

    session.add(stem)
    session.commit()
    session.refresh(stem)

    return {
        "id":               stem.id,
        "stem_type":        stem.stem_type,
        "pitch_shift":      stem.pitch_shift,
        "timbre_strength":  stem.timbre_strength,
        "volume":           stem.volume,
        "is_muted":         stem.is_muted,
    }


@router.post("/jobs/{job_id}/mix", summary="Mix all stems with current settings")
async def mix_stems(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(DemixJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Stems not ready yet")

    mix = DemixMix(job_id=job_id, output_s3_key="pending")
    session.add(mix)
    session.commit()
    session.refresh(mix)

    export_format = current_user.export_format or "wav"
    background_tasks.add_task(_run_mix, job_id, mix.id, export_format)

    return {"mix_id": mix.id, "status": "processing"}


@router.get("/mixes/{mix_id}", summary="Poll a specific mix for completion")
def get_mix_status(
    mix_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    mix = session.get(DemixMix, mix_id)
    if not mix:
        # Record deleted by _run_mix on failure
        return {"mix_id": mix_id, "ready": False, "failed": True, "url": None}
    job = session.get(DemixJob, mix.job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your mix")
    ready = mix.output_s3_key not in ("", "pending")
    url = storage.get_presigned_url(mix.output_s3_key) if ready else None
    return {"mix_id": mix.id, "ready": ready, "failed": False, "url": url}