"""Async Replicate REST client — Demucs (stem separation) + MusicGen (genre transform)."""
import os
import asyncio
import time
import httpx

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")
_BASE = "https://api.replicate.com/v1"

# Pinned version hashes for reproducibility
DEMUCS_VERSION   = "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953"
MUSICGEN_VERSION = "7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906"


def _headers() -> dict:
    return {
        "Authorization": f"Token {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }


async def _create_prediction(version: str, input_dict: dict) -> str:
    """POST /v1/predictions → returns prediction ID."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{_BASE}/predictions",
            headers=_headers(),
            json={"version": version, "input": input_dict},
        )
        if not resp.is_success:
            try:
                body = resp.json()
            except Exception:
                body = resp.text[:600]
            raise RuntimeError(f"Replicate {resp.status_code} creating prediction: {body}")
        return resp.json()["id"]


async def _poll_until_done(prediction_id: str, timeout: float = 600.0):
    """Poll GET /v1/predictions/{id} every 3 s until succeeded or failed."""
    deadline = time.monotonic() + timeout
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError(
                    f"Replicate prediction {prediction_id} timed out after {int(timeout)}s"
                )
            resp = await client.get(
                f"{_BASE}/predictions/{prediction_id}",
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status", "")
            if status == "succeeded":
                return data["output"]
            if status == "failed":
                raise RuntimeError(
                    f"Replicate prediction failed: {data.get('error') or data}"
                )
            await asyncio.sleep(3)


async def call_demucs(audio_url: str, model_name: str = "htdemucs") -> dict:
    """
    Run Demucs on Replicate using a pre-signed S3 URL as input.
    Replicate fetches the file directly — no re-upload needed.
    Returns {"vocals": url, "drums": url, "bass": url, "other": url}.
    """
    prediction_id = await _create_prediction(
        DEMUCS_VERSION,
        {
            "audio":         audio_url,
            "model_name":    model_name,
            "output_format": "wav",
            "float32":       True,
        },
    )
    output = await _poll_until_done(prediction_id, timeout=300.0)
    return _parse_demucs_output(output)


async def call_musicgen(
    melody_url: str,
    prompt: str,
    duration: int = 10,
    guidance: float = 9.5,
) -> str:
    """
    Run MusicGen melody-conditioned generation on Replicate.
    Returns URL of the generated WAV hosted by Replicate.
    """
    prediction_id = await _create_prediction(
        MUSICGEN_VERSION,
        {
            "model_version": "melody",
            "prompt":        prompt,
            "input_audio":   melody_url,
            "duration":      int(duration),
            "output_format": "wav",
        },
    )
    output = await _poll_until_done(prediction_id, timeout=600.0)
    if isinstance(output, list):
        return str(output[0])
    return str(output)


def _parse_demucs_output(output) -> dict:
    """Normalize Replicate Demucs output (dict or list) to {stem_type: url}.
    Filters out null entries — htdemucs returns guitar/piano as null since it doesn't produce those stems."""
    if isinstance(output, dict):
        return {k: v for k, v in output.items() if v is not None}
    if isinstance(output, list):
        stems: dict = {}
        for url in output:
            s = str(url).lower()
            if "no_vocal" in s:
                stems["no_vocals"] = str(url)
            elif "vocal" in s:
                stems["vocals"] = str(url)
            elif "drum" in s:
                stems["drums"] = str(url)
            elif "bass" in s:
                stems["bass"] = str(url)
            elif "other" in s:
                stems["other"] = str(url)
            else:
                stems[f"stem_{len(stems)}"] = str(url)
        return stems
    return {"output": str(output)}