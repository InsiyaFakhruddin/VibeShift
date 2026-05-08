"""
FastAPI wrapper for MusicGen genre transfer
Deploy with: uvicorn api:app --host 0.0.0.0 --port 8000 --workers 1

Usage:
    # Development
    uvicorn api:app --reload --host 0.0.0.0 --port 8000

    # Production on EC2
    gunicorn -w 1 -k uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:8000 \
        --timeout 300 \
        api:app
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from pathlib import Path
import torch
import logging

from genre_transfer import GenreTransfer, GENRE_PROMPTS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VibeShift MusicGen API",
    description="Transform music genres using AI",
    version="1.0.0"
)

# Add CORS middleware (for frontend integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance (loaded once at startup)
gt_model = None

@app.on_event("startup")
async def startup_event():
    """Initialize MusicGen model on startup"""
    global gt_model
    try:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Device: {device}")
        
        if device == 'cuda':
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB")
        
        print("Loading MusicGen model...")
        gt_model = GenreTransfer(device=device)
        print("✅ Model loaded and ready")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global gt_model
    if gt_model:
        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gt_model = None
        logger.info("Model unloaded")

# ── Health & Info Endpoints ────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": gt_model is not None,
        "device": gt_model.device if gt_model else "unknown",
        "cuda_available": torch.cuda.is_available(),
    }

@app.get("/info")
async def get_info():
    """Get API information"""
    info = {
        "service": "VibeShift MusicGen Genre Transfer",
        "version": "1.0.0",
        "device": gt_model.device if gt_model else "unknown",
        "model": "facebook/musicgen-melody",
        "sample_rate": gt_model.sample_rate if gt_model else None,
    }
    
    if torch.cuda.is_available():
        info["gpu"] = {
            "name": torch.cuda.get_device_name(0),
            "total_memory_gb": torch.cuda.get_device_properties(0).total_memory / 1e9,
        }
    
    return info

@app.get("/genres")
async def list_genres():
    """List available genre presets"""
    return {
        "available_genres": list(GENRE_PROMPTS.keys()),
        "note": "You can also pass custom text prompts, e.g., 'dark cinematic orchestral with heavy drums'",
        "presets": GENRE_PROMPTS,
    }

# ── Main Transform Endpoint ────────────────────────────────────────────────

@app.post("/transform")
async def transform_genre(
    audio_file: UploadFile = File(..., description="MP3 or WAV audio file"),
    target_genre: str = Form(..., description="Genre (blues, rock, pop, etc.) or custom prompt"),
    duration: float = Form(default=10.0, description="Seconds to process (max 60)"),
    start_offset: float = Form(default=5.0, description="Start position in seconds"),
    guidance: float = Form(default=9.5, description="MusicGen guidance scale (3-15)"),
    vocal_mix: float = Form(default=1.5, description="Vocal volume multiplier (0-3)"),
    instr_mix: float = Form(default=1.0, description="Instrumental volume multiplier (0-3)"),
):
    """
    Transform audio to target genre using MusicGen
    
    Returns WAV file with transformed audio
    
    Example:
        curl -X POST http://localhost:8000/transform \\
          -F "audio_file=@song.mp3" \\
          -F "target_genre=rock" \\
          -F "duration=10" \\
          --output output.wav
    """
    if not gt_model:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    # Validate inputs
    if not audio_file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    if duration <= 0 or duration > 60:
        raise HTTPException(status_code=400, detail="Duration must be between 0 and 60 seconds")
    
    if start_offset < 0:
        raise HTTPException(status_code=400, detail="Start offset must be non-negative")
    
    try:
        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as tmpdir:
            # Save uploaded file
            input_path = os.path.join(tmpdir, audio_file.filename)
            logger.info(f"Saving uploaded file to {input_path}")
            
            content = await audio_file.read()
            with open(input_path, "wb") as f:
                f.write(content)
            
            logger.info(f"Processing: {target_genre}, duration={duration}s, offset={start_offset}s")
            
            # Run genre transfer
            result = gt_model.convert(
                input_path=input_path,
                target_genre=target_genre,
                duration=duration,
                start_offset=start_offset,
                guidance=guidance,
                vocal_mix=vocal_mix,
                instr_mix=instr_mix,
                output_dir=tmpdir,
                stems_dir=os.path.join(tmpdir, "stems"),
            )
            
            logger.info(f"Transform complete: {result['output_path']}")
            
            # Return WAV file
            return FileResponse(
                result['output_path'],
                media_type="audio/wav",
                filename=f"vibeshift_{target_genre}.wav"
            )
    
    except Exception as e:
        logger.error(f"Transform failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# ── S3 Integration (Optional) ────────────────────────────────────────────

try:
    import boto3
    s3_available = True
except ImportError:
    s3_available = False

if s3_available:
    s3_client = boto3.client('s3')
    
    @app.post("/transform-s3")
    async def transform_from_s3(
        s3_bucket: str = Form(..., description="S3 bucket name"),
        s3_key: str = Form(..., description="S3 object key (path in bucket)"),
        target_genre: str = Form(...),
        duration: float = Form(default=10.0),
        start_offset: float = Form(default=5.0),
        guidance: float = Form(default=9.5),
        vocal_mix: float = Form(default=1.5),
        instr_mix: float = Form(default=1.0),
        output_bucket: str = Form(default=None, description="S3 bucket for output (default: same as input)"),
    ):
        """
        Process audio from S3 and save result back to S3
        Requires AWS credentials with S3 access
        """
        if not gt_model:
            raise HTTPException(status_code=503, detail="Model not initialized")
        
        try:
            output_bucket = output_bucket or s3_bucket
            
            with tempfile.TemporaryDirectory() as tmpdir:
                # Download from S3
                input_path = os.path.join(tmpdir, Path(s3_key).name)
                logger.info(f"Downloading from s3://{s3_bucket}/{s3_key}")
                s3_client.download_file(s3_bucket, s3_key, input_path)
                
                # Process
                result = gt_model.convert(
                    input_path=input_path,
                    target_genre=target_genre,
                    duration=duration,
                    start_offset=start_offset,
                    guidance=guidance,
                    vocal_mix=vocal_mix,
                    instr_mix=instr_mix,
                    output_dir=tmpdir,
                    stems_dir=os.path.join(tmpdir, "stems"),
                )
                
                # Upload result back to S3
                output_filename = Path(result['output_path']).name
                output_key = f"outputs/{output_filename}"
                logger.info(f"Uploading to s3://{output_bucket}/{output_key}")
                s3_client.upload_file(result['output_path'], output_bucket, output_key)
                
                return {
                    "status": "success",
                    "input_s3_uri": f"s3://{s3_bucket}/{s3_key}",
                    "output_s3_uri": f"s3://{output_bucket}/{output_key}",
                    "prompt_used": result['prompt_used'],
                }
        
        except Exception as e:
            logger.error(f"S3 transform failed: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"S3 processing failed: {str(e)}")

# ── Error Handlers ─────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
