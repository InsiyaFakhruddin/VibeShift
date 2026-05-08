# Multi-stage build to minimize image size
FROM nvidia/cuda:12.2.0-devel-ubuntu22.04 as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3-pip python3-dev \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and pre-build wheels
COPY requirements.txt .

# Create wheels for faster installation in final stage
RUN mkdir /wheels && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /wheels \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Final runtime image
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3-pip \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /wheels /wheels

# Copy requirements
COPY requirements.txt .

# Install Python packages from wheels
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --no-index --find-links /wheels \
    torch torchvision torchaudio && \
    pip install --no-cache-dir --no-index --find-links /wheels -r requirements.txt && \
    rm -rf /wheels

# Copy application code
COPY backend ./backend

# Pre-download demucs models to avoid first-run delays
RUN python3 -c "from demucs.pretrained import get_model; get_model('htdemucs')" || true

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python3 -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Expose port
EXPOSE 8000

# Environment variables
ENV CUDA_VISIBLE_DEVICES=0
ENV PYTHONUNBUFFERED=1

# Run FastAPI server with gunicorn
CMD ["gunicorn", \
     "-w", "1", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "300", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "backend.modules.genre_transform.musicgen.api:app"]
