from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import httpx

from database import User, DemixJob, Stem, DemixMix, get_session, engine
from auth import get_current_user
import storage

router = APIRouter(prefix="/demixer", tags=["demixer"])

GENRE_PROMPTS = {
    "blues": "blues music, slide guitar, harmonica, soulful vocals, slow rhythm",
    "classical": "classical orchestral music, strings, piano, symphony, elegant",
    "country": "country music, acoustic guitar, banjo, twang, fiddle, storytelling",
    "disco": "disco music, funky bass guitar, four-on-the-floor drums, synthesizer, dance",
    "hiphop": "hip hop music, boom bap drums, heavy bass, rap, urban, drum machine",
    "jazz": "jazz music, piano, upright bass, trumpet, swing, improvisation",
    "metal": "heavy metal, distorted electric guitar, double bass drum, aggressive, loud",
    "pop": "pop music, catchy hook, synthesizer, polished production, upbeat, chorus",
    "reggae": "reggae music, offbeat guitar, bass, relaxed, jamaican, one drop rhythm",
    "rock": "rock music, electric guitar, live drums, bass, energetic, band performance",
}


# ── Background task ─────────────────────────────────────────────────────────

async def _run_separation(job_id: str, s3_key: str, filename: str, export_format: str = "wav"):
    ml_url = os.getenv("ML_API_URL", "").rstrip("/")

    with Session(engine) as session:
        job = session.get(DemixJob, job_id)
        if not job:
            return
        job.status = "processing"
        job.updated_at = datetime.utcnow()
        session.add(job)
        session.commit()

    try:
        if not ml_url:
            raise RuntimeError(
                "ML_API_URL is not set. Start your Colab notebook and paste the ngrok URL into backend/.env"
            )

        audio_bytes = storage.download_bytes(s3_key)

        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{ml_url}/separate",
                files={"audio_file": (filename, audio_bytes, storage.content_type_for(filename))},
                data={"job_id": job_id, "export_format": export_format},
            )
            resp.raise_for_status()
            result = resp.json()

        # result: {"stems": {"vocals": "<s3_key>", "drums": "...", ...}}
        with Session(engine) as session:
            for stem_type, stem_s3_key in result["stems"].items():
                session.add(Stem(job_id=job_id, stem_type=stem_type, original_s3_key=stem_s3_key))
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


async def _run_mix(job_id: str, mix_id: str, export_format: str = "wav"):
    ml_url = os.getenv("ML_API_URL", "").rstrip("/")

    with Session(engine) as session:
        stems = session.exec(select(Stem).where(Stem.job_id == job_id)).all()
        stems_payload = [
            {
                "s3_key": s.modified_s3_key or s.original_s3_key,
                "stem_type": s.stem_type,
                "pitch_shift": s.pitch_shift,
                "timbre_strength": s.timbre_strength,
                "volume": s.volume,
                "is_muted": s.is_muted,
            }
            for s in stems
        ]

    try:
        if not ml_url:
            raise RuntimeError("ML_API_URL not set")

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{ml_url}/mix",
                json={"job_id": job_id, "stems": stems_payload, "export_format": export_format},
            )
            resp.raise_for_status()
            result = resp.json()

        # result: {"output_s3_key": "mixes/{job_id}/final_mix.wav"}
        with Session(engine) as session:
            mix = session.get(DemixMix, mix_id)
            if mix:
                mix.output_s3_key = result["output_s3_key"]
                session.add(mix)
                session.commit()

    except Exception as exc:
        with Session(engine) as session:
            mix = session.get(DemixMix, mix_id)
            if mix:
                session.delete(mix)
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
        original_s3_key="",   # filled after upload
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
            "id": s.id,
            "stem_type": s.stem_type,
            "pitch_shift": s.pitch_shift,
            "timbre_strength": s.timbre_strength,
            "volume": s.volume,
            "is_muted": s.is_muted,
            "download_url": storage.get_presigned_url(active_key) if job.status == "completed" else None,
        })

    mixes = session.exec(select(DemixMix).where(DemixMix.job_id == job_id)).all()
    latest_mix = mixes[-1] if mixes else None

    return {
        "id": job.id,
        "status": job.status,
        "song_name": job.song_name,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "stems": stem_data,
        "latest_mix_url": storage.get_presigned_url(latest_mix.output_s3_key) if latest_mix else None,
    }


class StemEditBody(BaseModel):
    pitch_shift: Optional[float] = None
    timbre_strength: Optional[float] = None
    volume: Optional[float] = None
    is_muted: Optional[bool] = None


@router.put("/stems/{stem_id}", summary="Update pitch/timbre/volume settings (persisted in DB)")
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

    if body.pitch_shift is not None:
        stem.pitch_shift = body.pitch_shift
    if body.timbre_strength is not None:
        stem.timbre_strength = body.timbre_strength
    if body.volume is not None:
        stem.volume = body.volume
    if body.is_muted is not None:
        stem.is_muted = body.is_muted
    stem.updated_at = datetime.utcnow()

    session.add(stem)
    session.commit()
    session.refresh(stem)

    return {"id": stem.id, "stem_type": stem.stem_type, "pitch_shift": stem.pitch_shift,
            "timbre_strength": stem.timbre_strength, "volume": stem.volume, "is_muted": stem.is_muted}


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