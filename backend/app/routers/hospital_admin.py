# backend/app/routers/hospital_admin.py
# All endpoints scoped to the logged-in hospital admin's hospital_id

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date as _date
import uuid
import secrets
import string as _string

from app.database.session import SessionLocal
from app.database.models import Nurse, ShiftAssignment, User
from app.utils.validators import get_current_admin_user
from app.utils.notification_helper import create_notification
from app.core.security import hash_password

router = APIRouter(prefix="/hospital-admin", tags=["Hospital Admin"])

SPECIALIZATIONS = ["Emergency", "Pediatrics", "ICU", "General", "Home Care"]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_hospital_admin(current_admin: dict = Depends(get_current_admin_user)):
    """Validates the caller is a hospital_admin and returns their hospital_id."""
    admin_role = current_admin.get("admin_role", "platform_admin")
    if admin_role not in ("hospital_admin", "platform_admin"):
        raise HTTPException(403, "Hospital Admin access required")
    return current_admin


# ── 1. Hospital Stats ──────────────────────────────────────────────────────────
@router.get("/stats")
def get_hospital_stats(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_hospital_admin)
):
    """Overview stats for the hospital admin's hospital."""
    hospital_id = current_admin.get("hospital_id")

    # All active nurses in this hospital (scoped by specialization if hospital_id set)
    nurse_query = db.query(Nurse).filter(Nurse.care_id_verified == True)
    active_nurses = nurse_query.all()

    total_tasks     = db.query(ShiftAssignment).filter(
        ShiftAssignment.task_title != None
    ).count()

    tasks_today     = db.query(ShiftAssignment).filter(
        ShiftAssignment.task_title != None,
        ShiftAssignment.shift_date == _date.today()
    ).count()

    dept_stats = []
    for spec in SPECIALIZATIONS:
        nurses_in_dept = db.query(Nurse).filter(
            Nurse.care_id_verified == True,
            Nurse.specialization.ilike(f"%{spec}%")
        ).count()
        tasks_in_dept = db.query(ShiftAssignment).filter(
            ShiftAssignment.task_title != None,
            ShiftAssignment.specialization_required.ilike(f"%{spec}%")
        ).count()
        pending_in_dept = db.query(ShiftAssignment).filter(
            ShiftAssignment.task_title != None,
            ShiftAssignment.task_status == "assigned",
            ShiftAssignment.specialization_required.ilike(f"%{spec}%")
        ).count()
        dept_stats.append({
            "department":   spec,
            "nurse_count":  nurses_in_dept,
            "total_tasks":  tasks_in_dept,
            "pending_tasks": pending_in_dept,
        })

    return {
        "active_nurses": len(active_nurses),
        "total_tasks":   total_tasks,
        "tasks_today":   tasks_today,
        "hospital_name": current_admin.get("hospital_name", "Your Hospital"),
        "departments":   dept_stats,
    }


# ── 2. Get nurses (scoped by specialization/search) ────────────────────────────
@router.get("/nurses")
def get_hospital_nurses(
    specialization: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_hospital_admin)
):
    query = db.query(Nurse).filter(Nurse.care_id_verified == True)
    if specialization and specialization != "All":
        query = query.filter(Nurse.specialization.ilike(f"%{specialization}%"))
    if search:
        query = query.filter(Nurse.full_name.ilike(f"%{search}%"))
    nurses = query.order_by(Nurse.full_name).all()
    return [
        {
            "id":             str(n.id),
            "full_name":      n.full_name,
            "email":          n.email,
            "specialization": n.specialization or "General",
            "phone":          n.phone,
        }
        for n in nurses
    ]


# ── 3. Task history for this hospital (read-only for Hospital Admin) ──────────
@router.get("/tasks")
def list_hospital_tasks(
    specialization: str = None,
    task_status: str = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_hospital_admin)
):
    query = db.query(ShiftAssignment, Nurse).join(
        Nurse, ShiftAssignment.nurse_id == Nurse.id
    ).filter(ShiftAssignment.task_title != None)

    if specialization and specialization != "All":
        query = query.filter(ShiftAssignment.specialization_required.ilike(f"%{specialization}%"))
    if task_status:
        query = query.filter(ShiftAssignment.task_status == task_status)

    rows = query.order_by(ShiftAssignment.shift_date.desc()).all()
    return [
        {
            "id":             str(t.id),
            "nurse_name":     n.full_name,
            "specialization": n.specialization or "General",
            "task_title":     t.task_title,
            "task_type":      t.task_type,
            "priority":       t.priority or "routine",
            "ward":           t.ward or t.location,
            "shift_date":     str(t.shift_date),
            "shift_time":     t.shift_time,
            "status":         t.task_status or "assigned",
            "assigned_by":    t.assigned_by,
        }
        for t, n in rows
    ]


# ── 5. Create dept head account ────────────────────────────────────────────────
@router.post("/dept-heads/create")
def create_dept_head(
    data: dict,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_hospital_admin),
    background_tasks: BackgroundTasks = None
):
    """Hospital admin creates a dept head account."""
    email      = (data.get("email") or "").strip()
    full_name  = (data.get("full_name") or "").strip()
    department = (data.get("department") or "").strip()

    if not email or not full_name or not department:
        raise HTTPException(400, "email, full_name, and department are required")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    # Generate 15-char password: letters + digits + symbols
    _chars = _string.ascii_letters + _string.digits + "!@#$%^&*()-_=+"
    plain_password = ''.join(secrets.choice(_chars) for _ in range(15))

    dept_head = User(
        email               = email,
        password            = hash_password(plain_password),
        role                = "admin",
        admin_role          = "dept_head",
        hospital_id         = uuid.UUID(current_admin["hospital_id"]) if current_admin.get("hospital_id") else None,
        hospital_name       = current_admin.get("hospital_name"),
        department          = department,
        full_name           = full_name,
        must_reset_password = True,
    )
    db.add(dept_head)
    db.commit()
    db.refresh(dept_head)

    return {
        "id":           str(dept_head.id),
        "email":        dept_head.email,
        "full_name":    dept_head.full_name,
        "department":   dept_head.department,
        "temp_password": plain_password,
        "message":      f"Dept Head account created for {full_name} ({department})",
    }


# ── 6. List dept heads ─────────────────────────────────────────────────────────
@router.get("/dept-heads")
def list_dept_heads(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_hospital_admin)
):
    heads = db.query(User).filter(User.admin_role == "dept_head").all()
    return [
        {
            "id":         str(h.id),
            "email":      h.email,
            "full_name":  h.full_name or h.email,
            "department": h.department,
        }
        for h in heads
    ]
