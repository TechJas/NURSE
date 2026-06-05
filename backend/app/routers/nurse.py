from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import hashlib

from app.database.session import SessionLocal
from app.database.models import Nurse, ShiftAssignment
from app.schemas.nurse import NurseCreate
from app.core.email import send_email
from app.core.security import hash_password
from app.utils.validators import get_current_nurse_user

router = APIRouter(prefix="/nurses", tags=["Nurses"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register_nurse(data: NurseCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if data.age < 21:
        raise HTTPException(400, "Minimum age is 21")

    existing = db.query(Nurse).filter(
        (Nurse.email == data.email) | (Nurse.registration_number == data.registration_number)
    ).first()
    if existing:
        if existing.email == data.email:
            raise HTTPException(409, "An account with this email already exists.")
        raise HTTPException(409, "Registration number is already in use.")

    nurse = Nurse(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        age=data.age,
        registration_number=data.registration_number,
        specialization=data.specialization,
    )
    nurse.password = hash_password(data.password)
    db.add(nurse)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email or registration number already exists.")

    subject = "Welcome to Carenium"
    context = {"name": nurse.full_name}
    background_tasks.add_task(send_email, nurse.email, subject, "email/welcome.html", context)

    return {"message": "Registered successfully. Upload documents."}


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """Return the current nurse's profile including care_id and lockout status."""
    nurse = db.query(Nurse).filter(Nurse.id == current_nurse["id"]).first()
    if not nurse:
        raise HTTPException(404, "Nurse not found")

    is_locked_out = (
        nurse.care_id_locked_until is not None
        and nurse.care_id_locked_until > datetime.now()
    )

    return {
        "id":                  str(nurse.id),
        "full_name":           nurse.full_name,
        "email":               nurse.email,
        "phone":               nurse.phone,
        "registration_number": nurse.registration_number,
        "specialization":      nurse.specialization,
        "is_verified":         nurse.is_verified,
        "is_active":           nurse.is_active,
        "interview_status":    nurse.interview_status,
        "shift_unlocked":      nurse.shift_unlocked or False,
        "care_id_verified":    nurse.care_id_verified or False,
        "care_id_assigned":    nurse.care_id is not None,
        "care_id_attempts":    nurse.care_id_attempts or 0,
        "is_locked_out":       is_locked_out,
        "locked_until":        nurse.care_id_locked_until.isoformat() if is_locked_out else None,
    }


@router.post("/unlock")
def unlock_working_shift(
    data: dict,
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """One-time CARE ID entry. 24hr lockout after 3 wrong attempts."""
    nurse = db.query(Nurse).filter(Nurse.id == current_nurse["id"]).first()
    if not nurse:
        raise HTTPException(404, "Nurse not found")

    # Already verified
    if nurse.care_id_verified or nurse.shift_unlocked:
        return {"message": "Working Shift section is already unlocked.", "already_unlocked": True}

    # Check lockout
    if nurse.care_id_locked_until and nurse.care_id_locked_until > datetime.now():
        raise HTTPException(
            status_code=403,
            detail="Too many wrong attempts. Please check the CARE ID in your registered email and try again after 24 hours."
        )

    submitted_key = data.get("key", "").strip()
    if not submitted_key:
        raise HTTPException(400, "CARE ID is required.")

    submitted_hash = hashlib.sha256(submitted_key.encode()).hexdigest()

    if submitted_hash != nurse.unlock_key_hash:
        nurse.care_id_attempts = (nurse.care_id_attempts or 0) + 1
        if nurse.care_id_attempts >= 3:
            nurse.care_id_locked_until = datetime.now() + timedelta(hours=24)
            db.commit()
            raise HTTPException(
                status_code=403,
                detail="Too many wrong attempts. Please check the CARE ID in your registered email and try again after 24 hours."
            )
        remaining = 3 - nurse.care_id_attempts
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Wrong CARE ID. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        )

    # Correct entry — permanently activate
    nurse.care_id_verified     = True
    nurse.shift_unlocked       = True
    nurse.care_id_attempts     = 0
    nurse.care_id_locked_until = None
    db.commit()

    return {
        "message":          "Access activated! Welcome to Carenium.",
        "access_level":     "full",
        "already_unlocked": False
    }


@router.get("/shift-info")
def get_shift_info(
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """Return nurse ID card data + shift assignments. Requires shift_unlocked = True."""
    nurse = db.query(Nurse).filter(Nurse.id == current_nurse["id"]).first()
    if not nurse:
        raise HTTPException(404, "Nurse not found")

    if not nurse.shift_unlocked:
        raise HTTPException(403, "Working Shift section is locked. Enter your CARE ID first.")

    shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.nurse_id == nurse.id
    ).order_by(ShiftAssignment.shift_date).all()

    raw_id = str(nurse.id).replace("-", "").upper()
    chars  = list(raw_id)
    unique_id = "CN-" + "".join(chars[0:4]) + "-" + "".join(chars[4:8]) + "-" + "".join(chars[8:12])

    return {
        "nurse_id_card": {
            "unique_id":         unique_id,
            "nurse_name":        nurse.full_name,
            "registration_number": nurse.registration_number,
            "valid_from":        nurse.created_at.strftime("%m/%y") if nurse.created_at else "01/26",
            "valid_upto":        "12/28",
            "assigned_position": nurse.specialization or "Staff Nurse",
        },
        "shifts": [
            {
                "id":             str(s.id),
                "shift_date":     str(s.shift_date),
                "shift_time":     s.shift_time,
                "location":       s.location,
                "task_notes":     s.task_notes,
                "task_title":     s.task_title,
                "task_type":      s.task_type,
                "priority":       s.priority or "routine",
                "ward":           s.ward or s.location,
                "floor":          s.floor_location,
                "status":         s.task_status or "assigned",
                "specialization": s.specialization_required,
                "assigned_by":    s.assigned_by,
            }
            for s in shifts
        ],
    }


@router.put("/tasks/{task_id}/acknowledge")
def acknowledge_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """Nurse acknowledges a task — changes status from 'assigned' to 'acknowledged'."""
    import uuid as _uuid
    try:
        task_uuid = _uuid.UUID(task_id)
    except Exception:
        raise HTTPException(400, "Invalid task ID")

    task = db.query(ShiftAssignment).filter(
        ShiftAssignment.id == task_uuid,
        ShiftAssignment.nurse_id == current_nurse["id"]
    ).first()
    if not task:
        raise HTTPException(404, "Task not found or not assigned to you")
    if task.task_status == "completed":
        raise HTTPException(400, "Task is already completed")

    task.task_status = "acknowledged"
    db.commit()
    return {"message": "Task acknowledged successfully", "status": "acknowledged"}
