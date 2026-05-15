"""
VibeShift Main API
Lightweight orchestration server — no ML models loaded here.
All heavy inference runs in the Colab notebook (GPU).

Run locally:
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Run on a server:
    gunicorn -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 main:app
"""

import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from auth import warmup_jwks
from routers.users import auth_router, users_router
from routers.demixer import router as demixer_router
from routers.transform import router as transform_router
from routers.library import router as library_router

app = FastAPI(
    title="VibeShift API",
    description="Auth + DB + job orchestration for the VibeShift app",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(demixer_router)
app.include_router(transform_router)
app.include_router(library_router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    print("✅ Database tables ready")
    if os.getenv("REPLICATE_API_TOKEN"):
        print("✅ Replicate API token loaded")
    else:
        print("⚠️  REPLICATE_API_TOKEN not set — add it to backend/.env")
    warmup_jwks()
    print("✅ JWKS keys pre-fetched")


@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "replicate": "configured" if os.getenv("REPLICATE_API_TOKEN") else "missing",
    }