from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database.session import SessionLocal
from app.database.models import Notification
from app.utils.validators import get_current_nurse_user

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/my-notifications")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """Return all notifications for the logged-in nurse, newest first."""
    nurse_id = current_nurse["id"]
    notifications = (
        db.query(Notification)
        .filter(Notification.nurse_id == nurse_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread_count = sum(1 for n in notifications if not n.is_read)

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
    }


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """Mark a specific notification as read. Validates ownership."""
    nurse_id = current_nurse["id"]

    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.nurse_id == nurse_id,
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notif.is_read = True
    db.commit()

    return {"message": "Notification marked as read"}
