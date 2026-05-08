# VibeShift MusicGen AWS Deployment Guide

## Overview
Your `genre_transfer.py` module processes audio through:
1. **Demucs** - Audio stem separation (vocals/instrumental)
2. **Vocal FX** - Genre-specific vocal effects
3. **MusicGen** - Facebook's melody model (transformer-based, GPU-intensive)
4. **Tempo Matching & Mixing** - Final audio composition

**GPU is essential** because MusicGen model inference is memory/compute-heavy.

---

## Architecture Options

### Option 1: AWS SageMaker (Recommended for simplicity)
✅ **Pros:** Managed GPU instances, built-in APIs, auto-scaling  
❌ **Cons:** Higher cost per hour, less control  

### Option 2: EC2 + FastAPI (Recommended for cost)
✅ **Pros:** Full control, cheaper long-term, standard Docker  
❌ **Cons:** Manual scaling, DevOps required  

### Option 3: ECS with Fargate (Best for microservices)
✅ **Pros:** Containerized, scalable, serverless  
❌ **Cons:** Container overhead, still needs GPU support  

---

## Recommended: EC2 + FastAPI + GPU

### Step 1: Create AWS EC2 Instance

**Instance Type:** `g4dn.xlarge` (GPU-accelerated)
- 1x NVIDIA T4 GPU (10GB VRAM)
- 4 vCPUs, 16GB RAM
- **Cost:** ~$0.60/hour (spot) or ~$0.89/hour (on-demand)

**Alternatives:**
- `g4dn.2xlarge`: 1x T4 (better for larger models)
- `g3.4xlarge`: 1x V100 (12GB VRAM, faster)

**AMI:** Ubuntu 22.04 LTS (NVIDIA driver pre-installed available)

**Storage:** 100GB+ (models are large)

### Step 2: Setup EC2 Instance

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install NVIDIA CUDA Toolkit & cuDNN
sudo apt install -y nvidia-cuda-toolkit nvidia-cudnn

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install AWS CLI (for S3 integration)
sudo apt install -y awscli
```

### Step 3: Containerize Your Application

Create `Dockerfile` in your backend root:

```dockerfile
FROM nvidia/cuda:12.2.0-devel-ubuntu22.04

WORKDIR /app

# Install Python & system deps
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend ./backend

# Install demucs model files (optional, pre-download to speed up)
RUN python3 -m demucs.separate --help > /dev/null

EXPOSE 8000

# Run FastAPI server
CMD ["uvicorn", "backend.modules.genre_transform.musicgen.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Updated `requirements.txt` additions:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pydantic==2.5.0
```

### Step 4: Create FastAPI Wrapper

Create `backend/modules/genre_transform/musicgen/api.py`:

```python
"""
FastAPI wrapper for MusicGen genre transfer
Deploy with: uvicorn api:app --host 0.0.0.0 --port 8000 --workers 1
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import os
import tempfile
import asyncio
from pathlib import Path
from genre_transfer import GenreTransfer

app = FastAPI(title="VibeShift MusicGen API", version="1.0")

# Global model instance (loaded once)
gt_model = None

@app.on_event("startup")
async def startup_event():
    """Initialize MusicGen model on startup"""
    global gt_model
    print("Loading MusicGen model...")
    gt_model = GenreTransfer(device='cuda')
    print("✅ Model loaded")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": gt_model is not None,
        "device": gt_model.device if gt_model else "unknown"
    }

@app.post("/transform")
async def transform_genre(
    audio_file: UploadFile = File(...),
    target_genre: str = Form(...),
    duration: float = Form(default=10.0),
    start_offset: float = Form(default=5.0),
    guidance: float = Form(default=9.5),
    vocal_mix: float = Form(default=1.5),
    instr_mix: float = Form(default=1.0),
):
    """
    Transform audio to target genre
    
    Args:
        audio_file: MP3 or WAV file
        target_genre: Genre (blues, rock, pop, etc.) or custom prompt
        duration: Seconds to process (default 10)
        start_offset: Start position in seconds (default 5)
        guidance: MusicGen guidance scale (default 9.5)
        vocal_mix: Vocal volume multiplier (default 1.5)
        instr_mix: Instrumental volume multiplier (default 1.0)
    
    Returns:
        WAV file with transformed audio
    """
    if not gt_model:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    # Create temp directory
    with tempfile.TemporaryDirectory() as tmpdir:
        # Save uploaded file
        input_path = os.path.join(tmpdir, audio_file.filename)
        with open(input_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        try:
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
            
            # Read output file
            with open(result['output_path'], 'rb') as f:
                output_data = f.read()
            
            return FileResponse(
                result['output_path'],
                media_type="audio/wav",
                filename=Path(result['output_path']).name
            )
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/genres")
async def list_genres():
    """List available genres"""
    from genre_transfer import GENRE_PROMPTS
    return {
        "available_genres": list(GENRE_PROMPTS.keys()),
        "note": "You can also pass custom text prompts"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 5: Build & Push Docker Image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name vibeshift-musicgen --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t vibeshift-musicgen:latest .

# Tag for ECR
docker tag vibeshift-musicgen:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen:latest
```

### Step 6: Deploy on EC2

```bash
# On EC2 instance:
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Pull image
docker pull YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen:latest

# Run container with GPU access
docker run --gpus all \
  -p 8000:8000 \
  -e CUDA_VISIBLE_DEVICES=0 \
  --name vibeshift-api \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen:latest
```

### Step 7: Setup API Gateway (Frontend Integration)

**Option A: AWS API Gateway (Recommended)**

```bash
# Create API Gateway pointing to EC2
# 1. Go to AWS API Gateway Console
# 2. Create REST API
# 3. Create resource /transform
# 4. POST method → HTTP integration → http://your-ec2-ip:8000/transform
# 5. Deploy to stage 'prod'
```

**Option B: ALB (Application Load Balancer)**

```bash
# More production-ready
# 1. Create ALB
# 2. Target group → EC2 instance on port 8000
# 3. Attach security groups
# 4. Use ALB DNS in frontend
```

### Step 8: S3 Integration for Audio Files

Modify `api.py` to support S3:

```python
import boto3

s3_client = boto3.client('s3')

@app.post("/transform-s3")
async def transform_from_s3(
    s3_bucket: str = Form(...),
    s3_key: str = Form(...),
    target_genre: str = Form(...),
):
    """Process audio from S3"""
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.wav")
        
        # Download from S3
        s3_client.download_file(s3_bucket, s3_key, input_path)
        
        # Process
        result = gt_model.convert(
            input_path=input_path,
            target_genre=target_genre,
            ...
        )
        
        # Upload result back to S3
        output_key = f"outputs/{Path(result['output_path']).name}"
        s3_client.upload_file(result['output_path'], s3_bucket, output_key)
        
        return {
            "status": "success",
            "output_s3_uri": f"s3://{s3_bucket}/{output_key}"
        }
```

---

## Deployment Checklist

- [ ] EC2 instance created (g4dn.xlarge)
- [ ] NVIDIA drivers installed
- [ ] Docker installed
- [ ] Dockerfile created & tested locally
- [ ] ECR repository created
- [ ] Image pushed to ECR
- [ ] EC2 security group allows port 8000
- [ ] IAM role for EC2 has S3 permissions
- [ ] API tested with curl/Postman
- [ ] API Gateway or ALB configured
- [ ] Frontend updated to hit new API endpoint

---

## Testing the API

```bash
# Health check
curl http://your-api-endpoint/health

# List genres
curl http://your-api-endpoint/genres

# Transform audio (multipart form)
curl -X POST http://your-api-endpoint/transform \
  -F "audio_file=@song.mp3" \
  -F "target_genre=rock" \
  -F "duration=10" \
  -F "start_offset=5" \
  --output output.wav
```

---

## Cost Estimation

| Component | Hourly | Monthly (730h) |
|-----------|--------|----------------|
| g4dn.xlarge (spot) | $0.60 | $438 |
| g4dn.xlarge (on-demand) | $0.89 | $650 |
| Data transfer (egress) | varies | ~$50-100 |
| **Total (spot)** | | **~$500-550** |

**For production:**
- Use Auto Scaling Groups
- Setup CloudWatch alarms
- Use S3 for long-term storage
- Consider Lambda for API orchestration

---

## Next Steps

1. Create EC2 instance
2. Test Docker image locally first
3. Push to ECR
4. Deploy to EC2
5. Configure API Gateway
6. Update frontend to hit `/transform` endpoint

Would you like me to create any of these files for you?
