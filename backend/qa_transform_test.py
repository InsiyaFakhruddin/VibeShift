"""
QA test: exercises the full genre-transform pipeline end-to-end without HTTP auth.
  1. Generates a 30-second synthetic music clip locally (multi-layered chord + rhythm)
  2. Uploads it to S3 as a test upload
  3. Inserts a TransformJob row into the DB
  4. Calls _run_transform() directly (the same function the background task runs)
  5. Polls the DB until completed / failed
  6. Prints a pass/fail summary

Run from the backend/ directory:
    python qa_transform_test.py
"""

import asyncio
import io
import os
import sys
import time
from pathlib import Path

# Load .env before anything else
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

import numpy as np
import soundfile as sf
from sqlmodel import Session, select

from database import engine, create_db_and_tables, User, TransformJob
import storage
from routers.transform import _run_transform

# ── Config ────────────────────────────────────────────────────────────────────
TEST_GENRE    = "jazz"
TEST_DURATION = 10      # seconds fed to MusicGen
TEST_OFFSET   = 5.0     # start_offset into the clip
POLL_INTERVAL = 10      # seconds between DB polls
MAX_WAIT      = 900     # 15 minutes total timeout
SAMPLE_RATE   = 44100
CLIP_DURATION = 30      # seconds of synthetic audio to generate


def _make_test_audio() -> bytes:
    """Generate a 30-second multi-layer synthetic music clip as WAV bytes."""
    sr = SAMPLE_RATE
    t  = np.linspace(0, CLIP_DURATION, sr * CLIP_DURATION, endpoint=False)

    # Chord: C major (C4, E4, G4) + octave bass
    chord = (
        np.sin(2 * np.pi * 261.63 * t) * 0.30 +   # C4
        np.sin(2 * np.pi * 329.63 * t) * 0.25 +   # E4
        np.sin(2 * np.pi * 392.00 * t) * 0.25 +   # G4
        np.sin(2 * np.pi * 130.81 * t) * 0.20      # C3 bass
    )
    # Kick-like pulse every 0.5 s (decay envelope)
    kick = np.zeros_like(t)
    for beat_t in np.arange(0, CLIP_DURATION, 0.5):
        idx = int(beat_t * sr)
        env = np.exp(-np.arange(min(sr // 8, len(t) - idx)) * 40 / sr)
        kick[idx : idx + len(env)] += np.sin(2 * np.pi * 80 * np.arange(len(env)) / sr) * env * 0.4
    # Snare-like noise burst every 1 s offset by 0.25 s
    snare = np.zeros_like(t)
    for beat_t in np.arange(0.5, CLIP_DURATION, 1.0):
        idx = int(beat_t * sr)
        env = np.exp(-np.arange(min(sr // 20, len(t) - idx)) * 60 / sr)
        snare[idx : idx + len(env)] += np.random.randn(len(env)) * env * 0.3

    mix = chord + kick + snare
    # Peak-normalize to 0.9
    peak = float(np.max(np.abs(mix)))
    if peak > 1e-9:
        mix = mix / peak * 0.9

    buf = io.BytesIO()
    sf.write(buf, mix.astype(np.float32), sr, format="WAV")
    return buf.getvalue()


def _get_first_user() -> User:
    with Session(engine) as s:
        user = s.exec(select(User)).first()
        if user is None:
            print("FAIL: No users found in the database -- start the app and log in first.")
            sys.exit(1)
        return user


def _create_job(user: User, s3_key: str) -> TransformJob:
    job = TransformJob(
        user_id=user.id,
        original_file_name="qa_test.wav",
        original_s3_key=s3_key,
        target_genre=TEST_GENRE,
        duration=float(TEST_DURATION),
        start_offset=TEST_OFFSET,
        guidance=9.5,
        vocal_mix=1.5,
        instr_mix=1.0,
    )
    with Session(engine) as s:
        s.add(job)
        s.commit()
        s.refresh(job)
        return job


def _poll_job(job_id: str) -> TransformJob:
    deadline = time.monotonic() + MAX_WAIT
    while True:
        with Session(engine) as s:
            job = s.get(TransformJob, job_id)
        print(f"  status={job.status}  updated={job.updated_at.strftime('%H:%M:%S')}")
        if job.status in ("completed", "failed"):
            return job
        if time.monotonic() > deadline:
            print(f"❌  Timed out after {MAX_WAIT}s")
            return job
        time.sleep(POLL_INTERVAL)


async def main():
    create_db_and_tables()

    # ── Preflight checks ──────────────────────────────────────────────────────
    token = os.getenv("REPLICATE_API_TOKEN", "")
    if not token:
        print("FAIL: REPLICATE_API_TOKEN not set in backend/.env")
        sys.exit(1)
    print(f"[OK] Replicate token: {token[:8]}...")

    # ── Step 1: Generate synthetic test audio ─────────────────────────────────
    print(f"\n[1/4] Generating {CLIP_DURATION}s synthetic test audio ...")
    audio_bytes = _make_test_audio()
    print(f"      Generated {len(audio_bytes):,} bytes")

    # ── Step 2: Find a user & upload to S3 ───────────────────────────────────
    user = _get_first_user()
    print(f"\n[2/4] Using user: {user.name or user.email}  (id={user.id[:8]}...)")

    s3_key = f"uploads/{user.id}/qa_test/qa_test.wav"
    print(f"      Uploading to S3: {s3_key}")
    storage.upload_bytes(audio_bytes, s3_key, "audio/wav")
    print("      Upload OK")

    # ── Step 3: Create DB job ─────────────────────────────────────────────────
    job = _create_job(user, s3_key)
    print(f"\n[3/4] Created TransformJob  id={job.id}")
    print(f"      genre={TEST_GENRE}  duration={TEST_DURATION}s  offset={TEST_OFFSET}s")

    # ── Step 4: Run the pipeline ──────────────────────────────────────────────
    print(f"\n[4/4] Running _run_transform()  (this can take 5-12 minutes) ...\n")
    await _run_transform(job.id, export_format="wav")

    # ── Poll for result ───────────────────────────────────────────────────────
    print("\nPolling DB …")
    final = _poll_job(job.id)

    # ── Report ────────────────────────────────────────────────────────────────
    print("\n" + "="*60)
    if final.status == "completed":
        url = storage.get_presigned_url(final.output_s3_key)
        print(f"PASS -- job completed successfully")
        print(f"    output_s3_key : {final.output_s3_key}")
        print(f"    download URL  : {url[:80]}...")
    else:
        print(f"FAIL -- status={final.status}")
        print(f"    error: {final.error_message}")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())