from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import User, DemixJob, TransformJob, get_session
from auth import get_clerk_user_id, get_current_user

# ── /auth ──────────────────────────────────────────────────────────────────

auth_router = APIRouter(prefix="/auth", tags=["auth"])


class SyncBody(BaseModel):
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None


@auth_router.post("/sync", summary="Create or update user record from Clerk JWT")
def sync_user(
    body: SyncBody,
    clerk_user_id: str = Depends(get_clerk_user_id),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.clerk_user_id == clerk_user_id)).first()
    if user:
        user.email = body.email
        # Only set name if the user hasn't already set one themselves.
        # This prevents every login from overwriting a manually-edited display name.
        if body.name and not user.name:
            user.name = body.name
        if body.avatar_url and not user.avatar_url:
            user.avatar_url = body.avatar_url
        user.updated_at = datetime.utcnow()
    else:
        user = User(
            clerk_user_id=clerk_user_id,
            email=body.email,
            name=body.name,
            avatar_url=body.avatar_url,
        )
        session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ── /users ─────────────────────────────────────────────────────────────────

users_router = APIRouter(prefix="/users", tags=["users"])


class UpdateBody(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None   # base64 data URI
    audio_quality: Optional[str] = None   # low | standard | high
    export_format: Optional[str] = None   # mp3 | wav | flac


@users_router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    demix_count = len(
        session.exec(select(DemixJob).where(DemixJob.user_id == current_user.id)).all()
    )
    transform_count = len(
        session.exec(select(TransformJob).where(TransformJob.user_id == current_user.id)).all()
    )
    return {
        "id": current_user.id,
        "clerk_user_id": current_user.clerk_user_id,
        "name": current_user.name,
        "email": current_user.email,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "audio_quality": current_user.audio_quality,
        "export_format": current_user.export_format,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "tracks_demixed": demix_count,
        "genres_changed": transform_count,
    }


@users_router.put("/me")
def update_me(
    body: UpdateBody,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if body.name is not None:
        current_user.name = body.name
    if body.bio is not None:
        current_user.bio = body.bio
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    if body.audio_quality is not None:
        current_user.audio_quality = body.audio_quality
    if body.export_format is not None:
        current_user.export_format = body.export_format
    current_user.updated_at = datetime.utcnow()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "email": current_user.email,
        "audio_quality": current_user.audio_quality,
        "export_format": current_user.export_format,
    }