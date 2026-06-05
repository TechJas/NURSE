from app.database.models import Notification


def create_notification(db, nurse_id, title, message, notification_type):
    """
    Reusable helper to create a notification record.
    Called by admin endpoints when actions occur (verify, reject, schedule, etc.)
    """
    notif = Notification(
        nurse_id=nurse_id,
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.add(notif)
    db.commit()
    return notif
