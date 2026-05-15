from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlmodel import Session
from datetime import datetime
import io
import numpy as np
import librosa
import soundfile as sf
import httpx
from scipy.signal import butter, sosfilt

from database import User, TransformJob, get_session, engine
from auth import get_current_user
import storage
from replicate_client import call_musicgen, call_demucs

router = APIRouter(prefix="/transform", tags=["transform"])

GENRE_PROMPTS = {
    "blues":     "blues music, slide guitar, harmonica, soulful vocals, slow rhythm",
    "classical": "classical orchestral music, strings, piano, symphony, elegant",
    "country":   "country music, acoustic guitar, banjo, twang, fiddle, storytelling",
    "disco":     "disco music, funky bass guitar, four-on-the-floor drums, synthesizer, dance",
    "hiphop":    "hip hop music, boom bap drums, heavy bass, rap, urban, drum machine",
    "jazz":      "jazz music, piano, upright bass, trumpet, swing, improvisation",
    "metal":     "heavy metal, distorted electric guitar, double bass drum, aggressive, loud",
    "pop":       "pop music, catchy hook, synthesizer, polished production, upbeat, chorus",
    "reggae":    "reggae music, offbeat guitar, bass, relaxed, jamaican, one drop rhythm",
    "rock":      "rock music, electric guitar, live drums, bass, energetic, band performance",
}


# ── Stage 3: Vocal FX ─────────────────────────────────────────────────────────
# Ported from genre_transfer.GenreTransfer._apply_vocal_fx

def _apply_vocal_fx(
    vocals_bytes: bytes,
    genre: str,
    start_offset: float,
    duration: float,
):
    y, sr = librosa.load(io.BytesIO(vocals_bytes), sr=None, mono=True)
    y = y[int(start_offset * sr) : int((start_offset + duration) * sr)]
    if len(y) == 0:
        y = np.zeros(int(duration * sr), dtype=np.float32)

    if genre in ("rock", "metal"):
        y   = np.tanh(y * 1.5) / 1.5
        sos = butter(2, 2000, btype="high", fs=sr, output="sos")
        y   = y + sosfilt(sos, y) * 0.3
    elif genre == "pop":
        peak = np.max(np.abs(y))
        over = np.maximum(np.abs(y) - peak * 0.6, 0)
        y    = y - np.sign(y) * over * 0.5
        sos  = butter(2, 8000, btype="high", fs=sr, output="sos")
        y    = y + sosfilt(sos, y) * 0.2
    elif genre == "jazz":
        sos = butter(4, 8000, btype="low", fs=sr, output="sos")
        y   = sosfilt(sos, y)
    elif genre in ("disco", "hiphop"):
        d = int(sr * 0.03)
        e = np.zeros_like(y)
        e[d:] = y[:-d] * 0.25
        y = y + e
    elif genre in ("country", "blues"):
        t = np.arange(len(y)) / sr
        y = y * (1.0 + 0.003 * np.sin(2 * np.pi * 5.0 * t))
    elif genre == "reggae":
        d = int(sr * 0.05)
        e = np.zeros_like(y)
        e[d:] = y[:-d] * 0.3
        y = y + e
        sos = butter(3, 7000, btype="low", fs=sr, output="sos")
        y   = sosfilt(sos, y)
    elif genre == "classical":
        sos = butter(2, 120, btype="high", fs=sr, output="sos")
        y   = sosfilt(sos, y)
        d   = int(sr * 0.04)
        e   = np.zeros_like(y)
        e[d:] = y[:-d] * 0.15
        y   = y + e

    peak = float(np.max(np.abs(y)))
    if peak > 1e-9:
        y = y / peak * 0.9
    return y, sr


# ── Stage 4: Tempo matching ───────────────────────────────────────────────────
# Ported from genre_transfer.GenreTransfer._match_vocal_tempo

def _match_vocal_tempo(
    vocals_np: np.ndarray,
    vocals_sr: int,
    instrumental_bytes: bytes,
    converted_np: np.ndarray,
    start_offset: float,
    duration: float,
    target_sr: int,
) -> np.ndarray:
    orig_np, orig_sr = librosa.load(io.BytesIO(instrumental_bytes), sr=None, mono=True)
    orig_clip = orig_np[int(start_offset * orig_sr) : int((start_offset + duration) * orig_sr)]

    orig_tempo, _ = librosa.beat.beat_track(y=orig_clip,    sr=orig_sr)
    conv_tempo, _ = librosa.beat.beat_track(y=converted_np, sr=target_sr)
    orig_tempo = float(np.atleast_1d(orig_tempo)[0])
    conv_tempo = float(np.atleast_1d(conv_tempo)[0])

    if vocals_sr != target_sr:
        vocals_np = librosa.resample(vocals_np, orig_sr=vocals_sr, target_sr=target_sr)

    if orig_tempo > 1 and conv_tempo > 1:
        stretch   = float(np.clip(conv_tempo / orig_tempo, 0.7, 1.5))
        vocals_np = librosa.effects.time_stretch(vocals_np, rate=stretch)

    return vocals_np


# ── Background task: genre transform via Replicate Demucs + MusicGen ─────────

async def _run_transform(job_id: str, export_format: str = "wav"):
    with Session(engine) as session:
        job = session.get(TransformJob, job_id)
        if not job:
            return
        job.status = "processing"
        job.updated_at = datetime.utcnow()
        session.add(job)
        session.commit()
        s3_key       = job.original_s3_key
        user_id      = job.user_id
        genre        = job.target_genre
        duration     = job.duration
        start_offset = job.start_offset
        guidance     = job.guidance
        vocal_mix    = job.vocal_mix
        instr_mix    = job.instr_mix

    try:
        prompt = GENRE_PROMPTS.get(genre.lower().strip(), genre)
        print(f"[Transform {job_id[:8]}] START genre={genre} duration={duration}s")

        # ── Stage 1: Presign the already-uploaded source audio ────────────────
        print(f"[Transform {job_id[:8]}] Stage 1: preparing audio URL")
        audio_url = storage.get_presigned_url(s3_key)

        # ── Stage 2: Replicate Demucs — 4 stems (vocals/drums/bass/other) ────
        print(f"[Transform {job_id[:8]}] Stage 2: Demucs on Replicate...")
        stem_urls = await call_demucs(audio_url, model_name="htdemucs")
        print(f"[Transform {job_id[:8]}] Stage 2 done — stems: {list(stem_urls.keys())}")

        vocals_bytes: bytes | None = None
        non_vocal_arrays: list[tuple[np.ndarray, int]] = []

        async with httpx.AsyncClient(timeout=300.0) as client:
            for stem_type, url in stem_urls.items():
                if not url:
                    continue
                resp = await client.get(url)
                resp.raise_for_status()
                if stem_type == "vocals":
                    vocals_bytes = resp.content
                else:
                    y, sr = librosa.load(io.BytesIO(resp.content), sr=None, mono=True)
                    non_vocal_arrays.append((y, sr))

        if vocals_bytes is None:
            raise RuntimeError("Demucs returned no vocals stem")
        if not non_vocal_arrays:
            raise RuntimeError("Demucs returned no non-vocal stems")

        # Mix drums + bass + other → one instrumental track
        sr_instr = non_vocal_arrays[0][1]
        if len(non_vocal_arrays) == 1:
            instr_arr = non_vocal_arrays[0][0]
        else:
            max_len = max(y.shape[0] for y, _ in non_vocal_arrays)
            instr_arr = np.zeros(max_len, dtype=np.float32)
            for y, _ in non_vocal_arrays:
                instr_arr[: y.shape[0]] += y
            peak = float(np.max(np.abs(instr_arr)))
            if peak > 1e-9:
                instr_arr = instr_arr / peak * 0.95

        instr_buf = io.BytesIO()
        sf.write(instr_buf, instr_arr, sr_instr, format="WAV")
        instrumental_bytes = instr_buf.getvalue()

        # ── Stage 2b: Upload stems to S3 ─────────────────────────────────────
        vocals_key       = f"transforms/{user_id}/{job_id}/vocals.wav"
        instrumental_key = f"transforms/{user_id}/{job_id}/instrumental.wav"
        storage.upload_bytes(vocals_bytes,       vocals_key,       "audio/wav")
        storage.upload_bytes(instrumental_bytes, instrumental_key, "audio/wav")
        print(f"[Transform {job_id[:8]}] Stage 2b: stems uploaded to S3")

        # ── Stage 3: Replicate MusicGen — melody-conditioned generation ───────
        print(f"[Transform {job_id[:8]}] Stage 3: MusicGen ({duration}s, guidance={guidance})...")
        instrumental_url = storage.get_presigned_url(instrumental_key)
        converted_url = await call_musicgen(
            melody_url=instrumental_url,
            prompt=prompt,
            duration=int(duration),
            guidance=guidance,
        )
        print(f"[Transform {job_id[:8]}] Stage 3 done — downloading output...")

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(converted_url)
            resp.raise_for_status()
            converted_bytes = resp.content

        converted_np, conv_sr = librosa.load(io.BytesIO(converted_bytes), sr=None, mono=True)

        # ── Stage 4: Vocal FX ─────────────────────────────────────────────────
        print(f"[Transform {job_id[:8]}] Stage 4: vocal FX")
        vocals_np, vocals_sr = _apply_vocal_fx(vocals_bytes, genre.lower(), start_offset, duration)

        # ── Stage 5: Tempo match ──────────────────────────────────────────────
        print(f"[Transform {job_id[:8]}] Stage 5: tempo matching")
        vocals_matched = _match_vocal_tempo(
            vocals_np=vocals_np,
            vocals_sr=vocals_sr,
            instrumental_bytes=instrumental_bytes,
            converted_np=converted_np,
            start_offset=start_offset,
            duration=duration,
            target_sr=conv_sr,
        )

        # ── Stage 6: Final mix + peak-normalize + upload ──────────────────────
        print(f"[Transform {job_id[:8]}] Stage 6: mixing and uploading")
        min_len   = min(len(converted_np), len(vocals_matched))
        final_mix = converted_np[:min_len] * instr_mix + vocals_matched[:min_len] * vocal_mix
        peak      = float(np.max(np.abs(final_mix)))
        if peak > 1e-9:
            final_mix = final_mix / peak * 0.95

        out_buf = io.BytesIO()
        sf.write(out_buf, final_mix.astype(np.float32), conv_sr, format="WAV")

        output_key = f"transforms/{user_id}/{job_id}/output.wav"
        storage.upload_bytes(out_buf.getvalue(), output_key, "audio/wav")

        with Session(engine) as session:
            job = session.get(TransformJob, job_id)
            job.output_s3_key = output_key
            job.prompt_used   = prompt
            job.status        = "completed"
            job.updated_at    = datetime.utcnow()
            session.add(job)
            session.commit()

        print(f"[Transform {job_id[:8]}] DONE")

    except Exception as exc:
        print(f"[Transform {job_id[:8]}] FAILED: {exc!r}")
        with Session(engine) as session:
            job = session.get(TransformJob, job_id)
            if job:
                job.status        = "failed"
                job.error_message = repr(exc)
                job.updated_at    = datetime.utcnow()
                session.add(job)
                session.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/genres", summary="List available genre presets")
def list_genres():
    return {
        "available_genres": list(GENRE_PROMPTS.keys()),
        "presets": GENRE_PROMPTS,
    }


@router.post("/jobs", summary="Upload audio and start genre transformation")
async def create_transform_job(
    background_tasks: BackgroundTasks,
    audio_file:   UploadFile = File(...),
    target_genre: str        = Form(...),
    duration:     float      = Form(default=10.0),
    start_offset: float      = Form(default=5.0),
    guidance:     float      = Form(default=9.5),
    vocal_mix:    float      = Form(default=1.5),
    instr_mix:    float      = Form(default=1.0),
    current_user: User    = Depends(get_current_user),
    session:      Session = Depends(get_session),
):
    if duration <= 0 or duration > 60:
        raise HTTPException(status_code=400, detail="Duration must be 1–60 seconds")

    content  = await audio_file.read()
    filename = audio_file.filename or "upload.wav"

    job = TransformJob(
        user_id=current_user.id,
        original_file_name=filename,
        original_s3_key="",
        target_genre=target_genre,
        duration=duration,
        start_offset=start_offset,
        guidance=guidance,
        vocal_mix=vocal_mix,
        instr_mix=instr_mix,
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
    background_tasks.add_task(_run_transform, job.id, export_format)

    return {"job_id": job.id, "status": "pending", "target_genre": target_genre}


@router.get("/jobs/{job_id}", summary="Poll job status")
def get_transform_job(
    job_id: str,
    current_user: User    = Depends(get_current_user),
    session:      Session = Depends(get_session),
):
    job = session.get(TransformJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    download_url = None
    if job.status == "completed" and job.output_s3_key:
        download_url = storage.get_presigned_url(job.output_s3_key)

    original_url = storage.get_presigned_url(job.original_s3_key) if job.original_s3_key else None
    song_name    = job.original_file_name.rsplit(".", 1)[0]

    return {
        "id":            job.id,
        "status":        job.status,
        "song_name":     song_name,
        "target_genre":  job.target_genre,
        "prompt_used":   job.prompt_used,
        "error_message": job.error_message,
        "created_at":    job.created_at.isoformat(),
        "download_url":  download_url,
        "original_url":  original_url,
    }


@router.delete("/jobs/{job_id}", summary="Delete a transform job and all its data")
def delete_transform_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(TransformJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    for key in [
        job.original_s3_key,
        job.output_s3_key,
        f"transforms/{job.user_id}/{job_id}/vocals.wav",
        f"transforms/{job.user_id}/{job_id}/instrumental.wav",
        f"transforms/{job.user_id}/{job_id}/output.wav",
    ]:
        if key:
            try: storage.delete_object(key)
            except Exception: pass

    session.delete(job)
    session.commit()

    return {"deleted": True, "job_id": job_id}