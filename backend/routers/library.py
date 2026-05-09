from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import User, DemixJob, TransformJob, get_session
from auth import get_current_user
import storage

router = APIRouter(prefix="/library", tags=["library"])


@router.get("", summary="All demix + transform jobs for the current user")
def get_library(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    demix_jobs = session.exec(
        select(DemixJob)
        .where(DemixJob.user_id == current_user.id)
        .order_by(DemixJob.created_at.desc())
    ).all()

    transform_jobs = session.exec(
        select(TransformJob)
        .where(TransformJob.user_id == current_user.id)
        .order_by(TransformJob.created_at.desc())
    ).all()

    def _demix_item(job: DemixJob):
        return {
            "id": job.id,
            "type": "demix",
            "song_name": job.song_name,
            "original_file_name": job.original_file_name,
            "status": job.status,
            "duration_seconds": job.duration_seconds,
            "created_at": job.created_at.isoformat(),
        }

    def _transform_item(job: TransformJob):
        return {
            "id": job.id,
            "type": "transform",
            "song_name": job.original_file_name.rsplit(".", 1)[0],
            "original_file_name": job.original_file_name,
            "target_genre": job.target_genre,
            "status": job.status,
            "created_at": job.created_at.isoformat(),
        }

    all_items = [_demix_item(j) for j in demix_jobs] + [_transform_item(j) for j in transform_jobs]
    all_items.sort(key=lambda x: x["created_at"], reverse=True)

    return {"items": all_items}