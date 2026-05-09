from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlmodel import Session, select
from datetime import datetime
import os
import httpx

from database import User, TransformJob, get_session, engine
from auth import get_current_user
import storage

router = APIRouter(prefix="/transform", tags=["transform"])

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


# ── Background task ──────────────────────────────────────────────────────────

async def _run_transform(job_id: str, export_format: str = "wav"):
    ml_url = os.getenv("ML_API_URL", "").rstrip("/")

    with Session(engine) as session:
        job = session.get(TransformJob, job_id)
        if not job:
            return
        job.status = "processing"
        job.updated_at = datetime.utcnow()
        session.add(job)
        session.commit()
        # capture values before session closes
        s3_key = job.original_s3_key
        filename = job.original_file_name
        genre = job.target_genre
        duration = job.duration
        start_offset = job.start_offset
        guidance = job.guidance
        vocal_mix = job.vocal_mix
        instr_mix = job.instr_mix

    try:
        if not ml_url:
            raise RuntimeError(
                "ML_API_URL not set. Start your Colab notebook and update backend/.env"
            )

        audio_bytes = storage.download_bytes(s3_key)

        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(
                f"{ml_url}/transform",
                files={"audio_file": (filename, audio_bytes, storage.content_type_for(filename))},
                data={
                    "target_genre": genre,
                    "duration": str(duration),
                    "start_offset": str(start_offset),
                    "guidance": str(guidance),
                    "vocal_mix": str(vocal_mix),
                    "instr_mix": str(instr_mix),
                    "job_id": job_id,
                    "export_format": export_format,
                },
            )
            resp.raise_for_status()
            result = resp.json()

        # result: {"output_s3_key": "...", "prompt_used": "..."}
        with Session(engine) as session:
            job = session.get(TransformJob, job_id)
            job.output_s3_key = result["output_s3_key"]
            job.prompt_used = result.get("prompt_used")
            job.status = "completed"
            job.updated_at = datetime.utcnow()
            session.add(job)
            session.commit()

    except Exception as exc:
        with Session(engine) as session:
            job = session.get(TransformJob, job_id)
            if job:
                job.status = "failed"
                job.error_message = str(exc)
                job.updated_at = datetime.utcnow()
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
    audio_file: UploadFile = File(...),
    target_genre: str = Form(...),
    duration: float = Form(default=10.0),
    start_offset: float = Form(default=5.0),
    guidance: float = Form(default=9.5),
    vocal_mix: float = Form(default=1.5),
    instr_mix: float = Form(default=1.0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if duration <= 0 or duration > 60:
        raise HTTPException(status_code=400, detail="Duration must be 1–60 seconds")

    content = await audio_file.read()
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(TransformJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    download_url = None
    if job.status == "completed" and job.output_s3_key:
        download_url = storage.get_presigned_url(job.output_s3_key)

    return {
        "id": job.id,
        "status": job.status,
        "target_genre": job.target_genre,
        "prompt_used": job.prompt_used,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "download_url": download_url,
    }