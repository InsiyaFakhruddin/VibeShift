from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vibeshift.db")
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def _gen_id() -> str:
    return str(uuid.uuid4())


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(default_factory=_gen_id, primary_key=True)
    clerk_user_id: str = Field(unique=True, index=True)
    name: Optional[str] = None
    email: str = Field(unique=True, index=True)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None   # base64 data URI stored directly
    audio_quality: str = Field(default="high")    # low | standard | high
    export_format: str = Field(default="wav")     # mp3 | wav | flac
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DemixJob(SQLModel, table=True):
    __tablename__ = "demix_jobs"
    id: str = Field(default_factory=_gen_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    original_file_name: str
    original_s3_key: str
    song_name: str
    duration_seconds: Optional[float] = None
    status: str = Field(default="pending")   # pending | processing | completed | failed
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Stem(SQLModel, table=True):
    __tablename__ = "stems"
    id: str = Field(default_factory=_gen_id, primary_key=True)
    job_id: str = Field(foreign_key="demix_jobs.id", index=True)
    stem_type: str                          # vocals | drums | bass | other | custom_*
    original_s3_key: str
    modified_s3_key: Optional[str] = None  # set after Colab applies pitch/timbre
    pitch_shift: float = Field(default=0.0)
    timbre_strength: float = Field(default=1.0)
    volume: float = Field(default=1.0)
    is_muted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DemixMix(SQLModel, table=True):
    __tablename__ = "demix_mixes"
    id: str = Field(default_factory=_gen_id, primary_key=True)
    job_id: str = Field(foreign_key="demix_jobs.id", index=True)
    output_s3_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TransformJob(SQLModel, table=True):
    __tablename__ = "transform_jobs"
    id: str = Field(default_factory=_gen_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    original_file_name: str
    original_s3_key: str
    target_genre: str
    prompt_used: Optional[str] = None
    output_s3_key: Optional[str] = None
    duration: float = Field(default=10.0)
    start_offset: float = Field(default=5.0)
    guidance: float = Field(default=9.5)
    vocal_mix: float = Field(default=1.5)
    instr_mix: float = Field(default=1.0)
    status: str = Field(default="pending")  # pending | processing | completed | failed
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session