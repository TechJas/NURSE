# backend/app/routers/dept_head.py
# All endpoints scoped by the dept_head's department (from JWT)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date as _date
import uuid

from app.database.session import SessionLocal
from app.database.models import Nurse, ShiftAssignment, User
from app.utils.validators import get_current_admin_user
from app.utils.notification_helper import create_notification

router = APIRouter(prefix="/dept", tags=["Dept Head"])

SPECIALIZATIONS = ["Emergency", "Pediatrics", "ICU", "General", "Home Care"]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_dept_head(current_admin: dict = Depends(get_current_admin_user)):
    """Validates the caller is a dept_head and returns their department."""
    admin_role = current_admin.get("admin_role", "platform_admin")
    if admin_role != "dept_head":
        raise HTTPException(403, "Department Head access required")
    if not current_admin.get("department"):
        raise HTTPException(403, "No department assigned to your account")
    return current_admin


# ── 1. Dept Stats ──────────────────────────────────────────────────────────────
@router.get("/stats")
def get_dept_stats(
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_dept_head)
):
    dept = current["department"]

    nurse_count = db.query(Nurse).filter(
        Nurse.care_id_verified == True,
        Nurse.specialization.ilike(f"%{dept}%")
    ).count()

    base_task = db.query(ShiftAssignment).filter(
        ShiftAssignment.task_title != None,
        ShiftAssignment.specialization_required.ilike(f"%{dept}%"),
    )
    if current.get("hospital_id"):
        base_task = base_task.filter(ShiftAssignment.hospital_id == uuid.UUID(current["hospital_id"]))

    total_tasks     = base_task.count()
    pending         = base_task.filter(ShiftAssignment.task_status == "assigned").count()
    acknowledged    = base_task.filter(ShiftAssignment.task_status == "acknowledged").count()
    tasks_today     = base_task.filter(ShiftAssignment.shift_date == _date.today()).count()

    return {
        "department":   dept,
        "nurse_count":  nurse_count,
        "total_tasks":  total_tasks,
        "pending":      pending,
        "acknowledged": acknowledged,
        "tasks_today":  tasks_today,
    }


# ── 2. Get nurses (only this department) ───────────────────────────────────────
@router.get("/nurses")
def get_dept_nurses(
    search: str = None,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_dept_head)
):
    dept = current["department"]
    query = db.query(Nurse).filter(
        Nurse.care_id_verified == True,
        Nurse.specialization.ilike(f"%{dept}%")
    )
    if current.get("hospital_id"):
        query = query.filter(Nurse.hospital_id == uuid.UUID(current["hospital_id"]))
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


# ── 3. Assign task (scoped to department) ──────────────────────────────────────
@router.post("/tasks/assign")
def assign_dept_task(
    data: dict,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_dept_head)
):
    dept = current["department"]

    try:
        nurse_uuid = uuid.UUID(data.get("nurse_id", ""))
    except Exception:
        raise HTTPException(400, "Invalid nurse_id")

    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(404, "Nurse not found")
    if not nurse.care_id_verified:
        raise HTTPException(400, "Nurse is not active")

    # Hard scope: nurse must belong to this department
    nurse_spec = (nurse.specialization or "").strip().lower()
    if dept.lower() not in nurse_spec:
        raise HTTPException(403,
            f"You can only assign tasks to {dept} nurses. "
            f"This nurse is in '{nurse.specialization}'.")

    try:
        shift_date = _date.fromisoformat(data.get("shift_date", ""))
    except Exception:
        raise HTTPException(400, "Invalid shift_date. Use YYYY-MM-DD.")
    if shift_date < _date.today():
        raise HTTPException(400, "Cannot assign a task on a past date.")

    task = ShiftAssignment(
        nurse_id                = nurse_uuid,
        shift_date              = shift_date,
        shift_time              = data.get("shift_time", ""),
        location                = data.get("ward", ""),
        task_title              = data.get("task_title", ""),
        task_type               = data.get("task_type", ""),
        priority                = data.get("priority", "routine"),
        ward                    = data.get("ward", ""),
        floor_location          = data.get("floor", ""),
        task_notes              = data.get("task_notes", ""),
        task_status             = "assigned",
        specialization_required = dept,
        assigned_by             = current.get("email", "dept_head"),
        hospital_id             = uuid.UUID(current["hospital_id"]) if current.get("hospital_id") else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    create_notification(
        db,
        nurse.id,
        "New Task Assigned",
        f"[{dept}] You have been assigned: {task.task_title} "
        f"at {task.ward} on {shift_date.strftime('%d %b %Y')} ({task.shift_time}).",
        "duty_assigned",
    )

    return {
        "id":         str(task.id),
        "nurse_name": nurse.full_name,
        "task_title": task.task_title,
        "priority":   task.priority,
        "ward":       task.ward,
        "shift_date": str(task.shift_date),
        "status":     task.task_status,
        "message":    f"Task assigned to {nurse.full_name} successfully.",
    }


# ── 4. Task history (only this dept) ──────────────────────────────────────────
@router.get("/tasks")
def list_dept_tasks(
    task_status: str = None,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_dept_head)
):
    dept = current["department"]
    query = db.query(ShiftAssignment, Nurse).join(
        Nurse, ShiftAssignment.nurse_id == Nurse.id
    ).filter(
        ShiftAssignment.task_title != None,
        ShiftAssignment.specialization_required.ilike(f"%{dept}%"),
    )
    if current.get("hospital_id"):
        query = query.filter(ShiftAssignment.hospital_id == uuid.UUID(current["hospital_id"]))
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
