# backend/app/routers/admin.py

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
import csv
import hashlib
import secrets
import string as _string
import random
from io import StringIO

from app.schemas.nurse import NurseOut
from app.schemas.document import NurseDocumentOut
from app.schemas.interview import InterviewCreate, InterviewOut, InterviewResultUpdate
from app.schemas.hospital import HospitalCreate, HospitalUpdate, HospitalOut
from app.schemas.position import PositionCreate, PositionUpdate, PositionOut
from app.schemas.audit import AuditLogOut
from app.schemas.admin import RejectKYCRequest, RequestReuploadRequest  # SECURITY: Input validation
from app.database.session import SessionLocal
from app.database.models import Nurse, NurseDocument, Interview, Hospital, Position, AuditLog, InterviewSession, Notification, ShiftAssignment, VenueMaster, User
from app.core.security import hash_password
from app.services.admin_service import send_verification_email, send_kyc_rejected_email
from app.core.email import send_email
from app.utils.validators import get_current_admin_user
from app.utils.notification_helper import create_notification
from app.utils.file_handler import get_signed_url
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

# SECURITY: Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SECURITY: UUID validation helper function
def validate_uuid(uuid_string: str, field_name: str = "ID") -> UUID:
    """
    Validate and convert string to UUID
    Raises HTTPException with 400 status if invalid
    """
    try:
        return UUID(uuid_string)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format. Must be a valid UUID."
        )

# Helper function to log admin actions
def log_admin_action(db: Session, admin_id: str, action_type: str, nurse_id: Optional[str] = None, 
                     previous_status: Optional[str] = None, new_status: Optional[str] = None, details: Optional[str] = None):
    audit_log = AuditLog(
        admin_id=admin_id,
        action_type=action_type,
        nurse_id=nurse_id,
        previous_status=previous_status,
        new_status=new_status,
        details=details
    )
    db.add(audit_log)
    db.commit()

# ========== NURSE & KYC MANAGEMENT ==========

# 1️⃣ List all nurses
@router.get("/nurses", response_model=List[NurseOut])
def list_nurses(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    nurses = db.query(Nurse).all()
    return nurses

# 2 - View documents for a specific nurse
@router.get("/nurses/{nurse_id}/documents", response_model=List[NurseDocumentOut])
def nurse_documents(
    nurse_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # SECURITY: Validate UUID
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    documents = db.query(NurseDocument).filter(NurseDocument.nurse_id == nurse_uuid).all()
    # Return empty list (not 404) so frontend can render the "no documents" state
    return documents


# 2️⃣b View a specific document (generates a secure signed URL — admin only)
@router.get("/nurses/{nurse_id}/documents/{document_id}/view")
def view_document(
    nurse_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """
    Generates a temporary signed URL (1 hour) so admin can view/download
    a nurse document securely. Never exposes raw storage paths.
    """
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    doc_uuid = validate_uuid(document_id, "Document ID")

    doc = db.query(NurseDocument).filter(
        NurseDocument.id == doc_uuid,
        NurseDocument.nurse_id == nurse_uuid
    ).first()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not doc.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No file associated with this document")

    signed_url = get_signed_url(doc.file_path, expires_in=3600)  # 1 hour

    log_admin_action(db, current_admin["id"], "DOCUMENT_VIEWED", nurse_id,
                     details=f"Viewed document {doc.document_type}")

    return {
        "document_id": str(doc.id),
        "document_type": doc.document_type,
        "signed_url": signed_url,
        "expires_in": "1 hour"
    }


# 3 - Verify a nurse (KYC approval)
@router.post("/nurses/{nurse_id}/verify")
@limiter.limit("10/minute")  # SECURITY: Rate limit to prevent abuse
def verify_nurse(
    request: Request,
    background_tasks: BackgroundTasks,
    nurse_id: str,
    approval_reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # SECURITY: Validate UUID
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")

    # COMPLIANCE GUARD: Nurse must have at least one uploaded document
    doc_count = db.query(NurseDocument).filter(NurseDocument.nurse_id == nurse_uuid).count()
    if doc_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve KYC: this nurse has not uploaded any documents."
        )

    previous_status = "Unverified" if not nurse.is_verified else "Verified"
    
    # Mark nurse as verified and active
    nurse.is_verified = True
    nurse.is_active = True
    db.commit()
    db.refresh(nurse)

    # Log action with approval reason
    log_admin_action(
        db, current_admin["id"], "KYC_APPROVED", nurse_id, previous_status, "Verified",
    )

    # Send verification email
    send_verification_email(nurse.email, nurse.full_name, background_tasks)

    # Create notification for the nurse
    create_notification(
        db, str(nurse.id),
        "KYC Documents Verified",
        "Your KYC documents have been verified. You are now eligible for interview scheduling.",
        "kyc_approved"
    )

    return {"message": f"Nurse {nurse.full_name} verified successfully. Ready for interview scheduling."}

# 4️⃣ Reject KYC with reason
@router.post("/nurses/{nurse_id}/reject")
@limiter.limit("10/minute")  # SECURITY: Rate limit
def reject_nurse(
    request: Request,
    background_tasks: BackgroundTasks,
    nurse_id: str,
    data: RejectKYCRequest,  # SECURITY: Pydantic validation
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # SECURITY: Validate UUID
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")

    nurse.is_verified = False
    nurse.is_active = False
    nurse.rejection_reason = data.reason  # Already validated by Pydantic
    db.commit()

    # Log action
    log_admin_action(db, current_admin["id"], "KYC_REJECTED", str(nurse_uuid), details=data.reason)

    # Create notification for the nurse
    create_notification(
        db, str(nurse.id),
        "KYC Documents Rejected",
        f"Your KYC was not approved. Reason: {data.reason}. Please re-upload corrected documents.",
        "kyc_rejected"
    )

    # Send rejection email
    send_kyc_rejected_email(nurse.email, nurse.full_name, data.reason, background_tasks)

    return {"message": f"Nurse {nurse.full_name} KYC rejected.", "reason": data.reason}

# 5 - Request document re-upload
@router.post("/nurses/{nurse_id}/request-reupload")
def request_reupload(
    nurse_id: str,
    data: RequestReuploadRequest,  # SECURITY: Pydantic validation
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # SECURITY: Validate UUID
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")

    # Find the specific document and flag it
    doc = db.query(NurseDocument).filter(
        NurseDocument.nurse_id == nurse_uuid,
        NurseDocument.document_type == data.document_type
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No uploaded document found for type '{data.document_type}'"
        )

    doc.reupload_requested = True
    doc.reupload_reason    = data.reason

    # In-app notification for the nurse
    create_notification(
        db, str(nurse.id),
        "Document Re-upload Required",
        f"Admin has requested you to re-upload '{data.document_type}'. Reason: {data.reason}",
        "reupload_requested"
    )

    # Log admin action
    log_admin_action(
        db, current_admin["id"],
        "DOCUMENT_REUPLOAD_REQUESTED", str(nurse_uuid),
        details=f"{data.document_type}: {data.reason}"
    )

    db.commit()
    return {
        "message": f"Re-upload requested for '{data.document_type}'",
        "nurse":   nurse.full_name,
        "reason":  data.reason,
    }

# 6️⃣ Search nurse by registration number or email
@router.get("/nurses/search", response_model=List[NurseOut])
def search_nurse(
    registration_number: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    query = db.query(Nurse)
    if registration_number:
        query = query.filter(Nurse.registration_number == registration_number)
    if email:
        query = query.filter(Nurse.email == email)

    result = query.all()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No nurse found")
    return result

# ========== INTERVIEW MANAGEMENT ==========

# 7️⃣ Schedule interview (only if KYC verified)
@router.post("/interviews", response_model=InterviewOut)
def schedule_interview(
    interview_data: InterviewCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # Check if nurse exists and is verified
    nurse = db.query(Nurse).filter(Nurse.id == interview_data.nurse_id).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")
    
    if not nurse.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                          detail="Cannot schedule interview. Nurse KYC must be verified first.")

    # Block past dates
    from datetime import date as _date
    interview_dt = interview_data.interview_date
    interview_date_only = interview_dt.date() if hasattr(interview_dt, 'date') else interview_dt
    if interview_date_only < _date.today():
        raise HTTPException(status_code=400, detail="Cannot schedule an interview on a past date.")

    # Create interview
    interview = Interview(**interview_data.dict())
    db.add(interview)
    
    # Update nurse interview status
    nurse.interview_status = "SCHEDULED"
    db.commit()
    db.refresh(interview)

    # Log action
    log_admin_action(db, current_admin["id"], "INTERVIEW_SCHEDULED", interview_data.nurse_id,
                    "PENDING", "SCHEDULED")

    return interview

# 8️⃣ List all interviews
@router.get("/interviews", response_model=List[InterviewOut])
def list_interviews(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    query = db.query(Interview)
    if status_filter:
        query = query.filter(Interview.status == status_filter)
    
    interviews = query.order_by(Interview.interview_date.desc()).all()
    return interviews

# 9️⃣ Get interviews by calendar date
@router.get("/interviews/calendar")
def get_interviews_calendar(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    interviews = db.query(Interview).filter(
        Interview.interview_date >= start_date,
        Interview.interview_date <= end_date
    ).all()
    
    # Group by date
    calendar_data = {}
    for interview in interviews:
        date_key = interview.interview_date.date().isoformat()
        if date_key not in calendar_data:
            calendar_data[date_key] = []
        calendar_data[date_key].append({
            "id": str(interview.id),
            "nurse_id": str(interview.nurse_id),
            "interviewer_name": interview.interviewer_name,
            "time": interview.interview_date.time().isoformat(),
            "location": interview.location,
            "status": interview.status
        })
    
    return calendar_data

# 🔟 Mark interview result
@router.put("/interviews/{interview_id}/result")
def mark_interview_result(
    interview_id: str,
    result_data: InterviewResultUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    # Update interview
    interview.result = result_data.result
    interview.status = "COMPLETED"
    if result_data.notes:
        interview.notes = result_data.notes

    # Update nurse interview status
    nurse = db.query(Nurse).filter(Nurse.id == interview.nurse_id).first()
    previous_status = nurse.interview_status
    nurse.interview_status = result_data.result

    db.commit()

    # Log action
    log_admin_action(db, current_admin["id"], "INTERVIEW_RESULT_MARKED", str(interview.nurse_id),
                    previous_status, result_data.result)

    return {"message": f"Interview result marked as {result_data.result}"}

# ========== POSITION ALLOCATION ==========

# 1️⃣1️⃣ Get eligible nurses (interview = PASSED)
@router.get("/nurses/eligible", response_model=List[NurseOut])
def get_eligible_nurses(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    nurses = db.query(Nurse).filter(Nurse.interview_status == "PASSED").all()
    return nurses

# 1️⃣2️⃣ Assign position (only if interview = PASSED)
@router.post("/positions", response_model=PositionOut)
def assign_position(
    position_data: PositionCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # Check if nurse exists and passed interview
    nurse = db.query(Nurse).filter(Nurse.id == position_data.nurse_id).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")
    
    if nurse.interview_status != "PASSED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                          detail="Cannot assign position. Nurse must have PASSED interview status.")

    # Check if hospital exists
    hospital = db.query(Hospital).filter(Hospital.id == position_data.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    # Create position
    position = Position(**position_data.dict())
    db.add(position)
    
    # Update nurse position_id
    nurse.position_id = position.id
    
    db.commit()
    db.refresh(position)

    # Log action
    log_admin_action(db, current_admin["id"], "POSITION_ASSIGNED", position_data.nurse_id,
                    details=f"Assigned to {hospital.name} as {position_data.position_type}")

    return position

# 1️⃣3️⃣ List all positions
@router.get("/positions", response_model=List[PositionOut])
def list_positions(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    query = db.query(Position)
    if status_filter:
        query = query.filter(Position.status == status_filter)
    
    positions = query.order_by(Position.created_at.desc()).all()
    return positions

# 1️⃣4️⃣ Update position
@router.put("/positions/{position_id}", response_model=PositionOut)
def update_position(
    position_id: str,
    position_data: PositionUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")

    # Update fields
    for key, value in position_data.dict(exclude_unset=True).items():
        setattr(position, key, value)

    db.commit()
    db.refresh(position)

    # Log action
    log_admin_action(db, current_admin["id"], "POSITION_UPDATED", str(position.nurse_id),
                    details=f"Position {position_id} updated")

    return position

# ========== HOSPITAL MANAGEMENT ==========

# 1️⃣5️⃣ Add hospital
@router.post("/hospitals", response_model=HospitalOut)
def add_hospital(
    hospital_data: HospitalCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    hospital = Hospital(**hospital_data.dict())
    db.add(hospital)
    db.commit()
    db.refresh(hospital)

    # Log action
    log_admin_action(db, current_admin["id"], "HOSPITAL_ADDED", details=f"Added {hospital.name}")

    return hospital

# 1️⃣6️⃣ List all hospitals
@router.get("/hospitals", response_model=List[HospitalOut])
def list_hospitals(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    hospitals = db.query(Hospital).order_by(Hospital.name).all()
    return hospitals

# 1️⃣7️⃣ Update hospital
@router.put("/hospitals/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: str,
    hospital_data: HospitalUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    # Update fields
    for key, value in hospital_data.dict(exclude_unset=True).items():
        setattr(hospital, key, value)

    db.commit()
    db.refresh(hospital)

    return hospital

# ========== ANALYTICS & AUDIT ==========

# 1️⃣8️⃣ Dashboard statistics
@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    total_nurses = db.query(Nurse).count()
    pending_kyc = db.query(Nurse).filter(Nurse.is_verified == False).count()
    verified_nurses = db.query(Nurse).filter(Nurse.is_verified == True).count()
    
    # Interviews today
    today = datetime.now().date()
    interviews_today = db.query(Interview).filter(
        func.date(Interview.interview_date) == today
    ).count()
    
    # Nurses awaiting allocation (PASSED but no position)
    awaiting_allocation = db.query(Nurse).filter(
        Nurse.interview_status == "PASSED",
        Nurse.position_id == None
    ).count()
    
    # Active nurses (with active positions)
    active_nurses = db.query(Position).filter(Position.status == "ACTIVE").count()
    
    # KYC status breakdown
    kyc_approved = verified_nurses
    kyc_rejected = db.query(Nurse).filter(Nurse.rejection_reason != None).count()
    kyc_pending = pending_kyc - kyc_rejected
    
    return {
        "total_registered_nurses": total_nurses,
        "pending_kyc": kyc_pending,
        "kyc_approved": kyc_approved,
        "kyc_rejected": kyc_rejected,
        "interviews_scheduled_today": interviews_today,
        "nurses_awaiting_allocation": awaiting_allocation,
        "active_nurses": active_nurses
    }

# 1️⃣9️⃣ Get audit logs
@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs


# ========== INTERVIEW SESSIONS (BATCH SCHEDULING) ==========

@router.post("/interviews/sessions")
def create_interview_session(
    data: dict,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # If the selected venue is a hospital, store its ID
    venue_hospital_id = data.get("hospital_id")
    if venue_hospital_id:
        try:
            venue_hospital_id = uuid.UUID(venue_hospital_id)
        except Exception:
            venue_hospital_id = None

    session = InterviewSession(
        venue_name=data["venue_name"],
        venue_address=data.get("venue_address"),
        interview_date=data["interview_date"],
        interview_time=data["interview_time"],
        instructions=data.get("instructions"),
        hospital_id=venue_hospital_id,
        created_by=current_admin["id"],
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_admin_action(db, current_admin["id"], "INTERVIEW_SESSION_CREATED",
                    details=f"{data['venue_name']} on {data['interview_date']}")

    return {
        "id": str(session.id),
        "venue_name": session.venue_name,
        "venue_address": session.venue_address,
        "interview_date": str(session.interview_date),
        "interview_time": session.interview_time,
        "instructions": session.instructions,
    }


@router.get("/interviews/sessions")
def list_interview_sessions(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    sessions = db.query(InterviewSession).order_by(InterviewSession.created_at.desc()).all()
    return [
        {
            "id": str(s.id),
            "venue_name": s.venue_name,
            "venue_address": s.venue_address,
            "interview_date": str(s.interview_date),
            "interview_time": s.interview_time,
            "instructions": s.instructions,
        }
        for s in sessions
    ]


@router.post("/interviews/assign")
def batch_assign_nurses(
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Assign multiple nurses to an interview session."""
    session_id = data["session_id"]
    nurse_ids = data["nurse_ids"]

    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    assigned = []
    for nid in nurse_ids:
        nurse = db.query(Nurse).filter(Nurse.id == nid).first()
        if not nurse or not nurse.is_verified:
            continue

        # Create interview record
        interview = Interview(
            nurse_id=nid,
            interviewer_name="Admin Panel",
            interview_date=datetime.combine(session.interview_date, datetime.min.time()),
            location=session.venue_name,
            status="SCHEDULED",
        )
        db.add(interview)
        nurse.interview_status = "SCHEDULED"

        # Create notification
        create_notification(
            db, str(nurse.id),
            "Interview Scheduled",
            f"You are selected for an interview at {session.venue_name} on {session.interview_date}. Check your email for details.",
            "interview_scheduled"
        )

        # Send interview scheduled email
        subject = "Interview Scheduled - Carenium"
        context = {
            "nurse_name": nurse.full_name,
            "venue_name": session.venue_name,
            "venue_address": session.venue_address or "",
            "interview_date": str(session.interview_date),
            "interview_time": session.interview_time or "",
            "instructions": session.instructions or "",
        }
        background_tasks.add_task(send_email, nurse.email, subject, "email/interview_scheduled.html", context)

        assigned.append(str(nurse.id))

    db.commit()

    log_admin_action(db, current_admin["id"], "BATCH_INTERVIEW_ASSIGNED",
                    details=f"Assigned {len(assigned)} nurses to session {session.venue_name}")

    return {"message": f"{len(assigned)} nurses assigned to interview", "assigned": assigned}


# ========== INTERVIEW RESULT + UNLOCK KEY ==========

@router.post("/interviews/{nurse_id}/result")
def submit_interview_result(
    nurse_id: str,
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=404, detail="Nurse not found")

    result = data["result"]  # "selected" or "not_selected"

    if result == "selected":
        # Link nurse to hospital from interview location
        latest_interview = db.query(Interview).filter(
            Interview.nurse_id == nurse_uuid
        ).order_by(Interview.created_at.desc()).first()
        if latest_interview and latest_interview.location:
            matched_hosp = db.query(Hospital).filter(
                Hospital.name.ilike(latest_interview.location)
            ).first()
            if matched_hosp:
                nurse.hospital_id = matched_hosp.id

        # Generate CARE ID in format CARE-20YY-XXXX
        year_short = str(datetime.now().year)[-2:]        # e.g. "26"
        four_digit  = str(random.randint(1000, 9999))     # e.g. "4821"
        unlock_key  = f"CARE-20{year_short}-{four_digit}" # e.g. "CARE-2026-4821"

        # Store plain CARE ID and its hash
        nurse.care_id = unlock_key
        nurse.unlock_key_hash = hashlib.sha256(unlock_key.encode()).hexdigest()
        nurse.interview_status = "SELECTED"

        create_notification(
            db, str(nurse.id),
            "Congratulations! Interview Passed",
            "You have been selected! Your CARE ID will be sent to your email shortly.",
            "interview_passed"
        )

        # Send interview passed email with CARE ID immediately
        subject = "Congratulations! Your CARE ID - Carenium"
        context = {"nurse_name": nurse.full_name, "care_id": unlock_key}
        background_tasks.add_task(send_email, nurse.email, subject, "email/interview_passed.html", context)

        log_admin_action(db, current_admin["id"], "INTERVIEW_PASSED", nurse_id)
        db.commit()

        return {"message": f"Nurse selected. Unlock key: {unlock_key}", "unlock_key": unlock_key}

    else:
        nurse.interview_status = "REJECTED"

        create_notification(
            db, str(nurse.id),
            "Interview Result",
            "Thank you for attending the interview. Unfortunately, you were not selected at this time.",
            "interview_failed"
        )

        # Send interview failed email
        subject = "Interview Result - Carenium"
        context = {"nurse_name": nurse.full_name}
        background_tasks.add_task(send_email, nurse.email, subject, "email/interview_failed.html", context)

        log_admin_action(db, current_admin["id"], "INTERVIEW_FAILED", nurse_id)
        db.commit()

        return {"message": "Nurse marked as not selected"}


# ========== SHIFT ASSIGNMENTS ==========

@router.post("/nurses/{nurse_id}/shifts")
def create_shift(
    nurse_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=404, detail="Nurse not found")

    task_hospital_id = None
    if current_admin.get("admin_role") in ("hospital_admin", "dept_head") and current_admin.get("hospital_id"):
        task_hospital_id = uuid.UUID(current_admin["hospital_id"])

    shift = ShiftAssignment(
        nurse_id=nurse_uuid,
        shift_date=data["shift_date"],
        shift_time=data["shift_time"],
        location=data["location"],
        task_notes=data.get("task_notes"),
        hospital_id=task_hospital_id,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    return {"message": "Shift created", "id": str(shift.id)}


@router.get("/nurses/{nurse_id}/shifts")
def get_nurse_shifts(
    nurse_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.nurse_id == nurse_uuid
    ).order_by(ShiftAssignment.shift_date).all()

    return [
        {
            "id": str(s.id),
            "shift_date": str(s.shift_date),
            "shift_time": s.shift_time,
            "location": s.location,
            "task_notes": s.task_notes,
        }
        for s in shifts
    ]


# ========== CSV EXPORT ==========

@router.get("/nurses/export")
def export_nurses(
    filter: str = "all",
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    query = db.query(Nurse)

    if filter == "kyc_approved":
        query = query.filter(Nurse.is_verified == True)
    elif filter == "kyc_pending":
        query = query.filter(Nurse.is_verified == False)
    elif filter == "interview_scheduled":
        query = query.filter(Nurse.interview_status == "SCHEDULED")
    elif filter == "interview_passed":
        query = query.filter(Nurse.interview_status.in_(["SELECTED", "PASSED"]))
    elif filter == "active":
        query = query.filter(Nurse.shift_unlocked == True)

    nurses = query.all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Reg No", "KYC Status",
                     "Interview Status", "Registered Date"])
    for n in nurses:
        writer.writerow([
            n.full_name, n.email, n.phone, n.registration_number,
            "Approved" if n.is_verified else "Pending",
            n.interview_status or "PENDING",
            str(n.created_at) if n.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=nurses_{filter}.csv"}
    )


# ========== RESULTS CSV UPLOAD (Step 6) ==========

@router.post("/interviews/upload-results")
async def upload_interview_results(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Upload a CSV of interview results. Auto-generates CARE IDs for PASSED candidates."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    decoded = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(StringIO(decoded))

    passed_count  = 0
    failed_count  = 0
    unmatched     = []
    processed     = 0

    for row in reader:
        email  = (row.get("email") or row.get("Email") or "").strip().lower()
        result = (row.get("result") or row.get("Result") or "").strip().upper()

        if not email:
            continue

        nurse = db.query(Nurse).filter(func.lower(Nurse.email) == email).first()
        if not nurse:
            unmatched.append(email)
            continue

        processed += 1
        if result == "PASSED":
            # Generate CARE ID in format CARE-20YY-XXXX
            year_short = str(datetime.now().year)[-2:]
            four_digit  = str(random.randint(1000, 9999))
            care_id     = f"CARE-20{year_short}-{four_digit}"
            nurse.care_id          = care_id
            nurse.unlock_key_hash  = hashlib.sha256(care_id.encode()).hexdigest()
            nurse.interview_status = "PASSED"
            passed_count += 1
        elif result == "FAILED":
            nurse.interview_status = "FAILED"
            failed_count += 1

    db.commit()

    log_admin_action(
        db, current_admin["id"], "RESULTS_CSV_UPLOADED",
        details=f"Processed {processed}: {passed_count} passed, {failed_count} failed, {len(unmatched)} unmatched"
    )

    return {
        "processed":  processed,
        "passed":     passed_count,
        "failed":     failed_count,
        "unmatched":  unmatched,
        "message":    f"Results uploaded. {passed_count} CARE IDs generated."
    }


# ========== VENUE MASTER CSV (Step 7) ==========

@router.post("/venues/upload")
async def upload_venue_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Upload Venue Master CSV. Replaces all existing venues."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    decoded = content.decode("utf-8", errors="replace")
    reader  = csv.DictReader(StringIO(decoded))

    # Clear existing venues
    db.query(VenueMaster).delete()

    count = 0
    for row in reader:
        name = (row.get("venue_name") or row.get("Venue Name") or "").strip()
        if not name:
            continue
        venue = VenueMaster(
            venue_name  = name,
            room_number = (row.get("room_number") or row.get("Room Number") or "").strip() or None,
            floor       = (row.get("floor")       or row.get("Floor")       or "").strip() or None,
            block       = (row.get("block")        or row.get("Block")       or "").strip() or None,
            branch      = (row.get("branch")       or row.get("Branch")      or "").strip() or None,
        )
        db.add(venue)
        count += 1

    db.commit()
    log_admin_action(db, current_admin["id"], "VENUE_CSV_UPLOADED", details=f"{count} venues loaded")
    return {"loaded": count, "message": f"{count} venues loaded successfully."}


@router.get("/venues")
def get_venues(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Return VenueMaster records + Hospital names for interview session dropdown."""
    venues = db.query(VenueMaster).order_by(VenueMaster.venue_name).all()
    hospitals = db.query(Hospital).order_by(Hospital.name).all()
    result = []
    for v in venues:
        result.append({
            "id":         str(v.id),
            "venue_name": v.venue_name,
            "address":    v.branch or "",
            "room_number": v.room_number or "",
            "floor":      v.floor or "",
            "block":      v.block or "",
            "type":       "venue",
        })
    for h in hospitals:
        result.append({
            "id":         f"hosp_{h.id}",
            "venue_name": h.name,
            "address":    f"{h.city}, {h.state}" if h.city or h.state else "",
            "room_number": "",
            "floor":      "",
            "block":      "",
            "type":       "hospital",
        })
    return result


# ========== CARE ID EMAIL SENDING (Step 8) ==========

@router.post("/care-id/send/{nurse_id}")
def send_care_id_email(
    nurse_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Send CARE ID email to one PASSED nurse. Resend uses same CARE ID."""
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=404, detail="Nurse not found")
    if nurse.interview_status not in ("PASSED", "SELECTED"):
        raise HTTPException(status_code=400, detail="Nurse has not passed the interview.")
    if not nurse.care_id:
        raise HTTPException(status_code=400, detail="No CARE ID generated for this nurse.")

    context = {
        "nurse_name": nurse.full_name,
        "care_id":    nurse.care_id,
    }
    background_tasks.add_task(
        send_email,
        nurse.email,
        "Congratulations! Your CARE ID - Carenium",
        "email/interview_passed.html",
        context
    )
    nurse.care_id_email_sent = True

    # Notify nurse that email has been sent
    create_notification(
        db, str(nurse.id),
        "CARE ID Sent to Email",
        "Your CARE ID has been sent to your email. Please check your inbox and use it to access the Working Shift section.",
        "care_id_sent"
    )

    db.commit()

    log_admin_action(db, current_admin["id"], "CARE_ID_EMAIL_SENT", nurse_id)
    return {"message": f"CARE ID email sent to {nurse.email}"}


@router.post("/care-id/send-bulk")
def send_care_id_bulk(
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Bulk email: target='passed' sends CARE ID emails; target='failed' sends rejection emails."""
    target = data.get("target", "").lower()
    if target not in ("passed", "failed"):
        raise HTTPException(status_code=400, detail="target must be 'passed' or 'failed'")

    sent = 0
    if target == "passed":
        nurses = db.query(Nurse).filter(
            Nurse.interview_status.in_(["PASSED", "SELECTED"]),
            Nurse.care_id != None
        ).all()
        for nurse in nurses:
            context = {"nurse_name": nurse.full_name, "care_id": nurse.care_id}
            background_tasks.add_task(
                send_email, nurse.email,
                "Congratulations! Your CARE ID - Carenium",
                "email/interview_passed.html", context
            )
            nurse.care_id_email_sent = True
            create_notification(
                db, str(nurse.id),
                "CARE ID Sent to Email",
                "Your CARE ID has been sent to your email. Please check your inbox and use it to access the Working Shift section.",
                "care_id_sent"
            )
            sent += 1
    else:
        nurses = db.query(Nurse).filter(Nurse.interview_status == "FAILED").all()
        for nurse in nurses:
            context = {"nurse_name": nurse.full_name}
            background_tasks.add_task(
                send_email, nurse.email,
                "Interview Result - Carenium",
                "email/interview_failed.html", context
            )
            sent += 1

    db.commit()
    log_admin_action(db, current_admin["id"], f"BULK_EMAIL_{target.upper()}", details=f"{sent} emails dispatched")
    return {"sent": sent, "target": target, "message": f"{sent} emails dispatched to {target} candidates."}


# ========== RESET NURSE LOCKOUT (Step 9) ==========

@router.post("/care-id/reset-lockout/{nurse_id}")
def reset_care_id_lockout(
    nurse_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Admin resets a nurse's CARE ID lockout so they can try again immediately."""
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=404, detail="Nurse not found")

    nurse.care_id_attempts     = 0
    nurse.care_id_locked_until = None
    db.commit()

    log_admin_action(db, current_admin["id"], "CARE_ID_LOCKOUT_RESET", nurse_id)
    return {"message": f"Lockout cleared for {nurse.full_name}. They can try again immediately."}


# ========== SYSTEM ID GENERATION LIST (Step 6 — admin view) ==========

@router.get("/system-id/candidates")
def get_system_id_candidates(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Returns all nurses who have been through the interview (PASSED or FAILED) for the System ID Generation page."""
    nurses = db.query(Nurse).filter(
        Nurse.interview_status.in_(["PASSED", "SELECTED", "FAILED", "REJECTED"])
    ).order_by(Nurse.full_name).all()

    return [
        {
            "id":                 str(n.id),
            "full_name":          n.full_name,
            "email":              n.email,
            "phone":              n.phone,
            "interview_status":   n.interview_status,
            "care_id":            n.care_id,
            "care_id_email_sent": n.care_id_email_sent or False,
            "care_id_verified":   n.care_id_verified   or False,
            "is_locked_out":      (
                n.care_id_locked_until is not None
                and n.care_id_locked_until > datetime.now()
            ),
        }
        for n in nurses
    ]


# ========== TASK ASSIGNMENT (Phase 1) ==========

@router.get("/nurses/active")
def get_active_nurses(
    specialization: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Returns all shift-unlocked nurses, filterable by specialization + search by name."""
    query = db.query(Nurse).filter(Nurse.care_id_verified == True)
    if specialization:
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


@router.post("/tasks/assign")
def assign_task(
    data: dict,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Admin assigns a task to an active nurse. Hard-blocks specialization mismatch."""
    from datetime import date as _date

    nurse_uuid = validate_uuid(data.get("nurse_id", ""), "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(404, "Nurse not found")
    if not nurse.care_id_verified:
        raise HTTPException(400, "Nurse is not active (CARE ID not verified)")

    # Hard specialization match
    spec_required = (data.get("specialization_required") or "").strip()
    nurse_spec    = (nurse.specialization or "").strip().lower()
    if spec_required and spec_required.lower() != nurse_spec:
        raise HTTPException(400,
            f"Specialization mismatch: nurse is '{nurse.specialization}' "
            f"but task requires '{spec_required}'.")

    # Block past dates
    try:
        shift_date = _date.fromisoformat(data.get("shift_date", ""))
    except Exception:
        raise HTTPException(400, "Invalid shift_date. Use YYYY-MM-DD.")
    if shift_date < _date.today():
        raise HTTPException(400, "Cannot assign a task on a past date.")

    # Derive hospital_id from the admin's hospital context (null for platform_admin)
    task_hospital_id = None
    if current_admin.get("admin_role") in ("hospital_admin", "dept_head") and current_admin.get("hospital_id"):
        task_hospital_id = uuid.UUID(current_admin["hospital_id"])

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
        specialization_required = spec_required,
        assigned_by             = current_admin.get("email", "admin"),
        hospital_id             = task_hospital_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    create_notification(
        db,
        nurse.id,
        "New Task Assigned",
        f"You have been assigned: {task.task_title} "
        f"at {task.ward} on {shift_date.strftime('%d %b %Y')} ({task.shift_time}).",
        "duty_assigned",
    )
    log_admin_action(db, current_admin["id"], "TASK_ASSIGNED", str(nurse.id),
        details=f"{task.task_title} | {task.priority} | {shift_date}")

    return {
        "id":         str(task.id),
        "nurse_name": nurse.full_name,
        "task_title": task.task_title,
        "priority":   task.priority,
        "ward":       task.ward,
        "shift_date": str(task.shift_date),
        "shift_time": task.shift_time,
        "status":     task.task_status,
        "message":    f"Task assigned to {nurse.full_name} successfully.",
    }


@router.get("/tasks")
def list_tasks(
    specialization: str = None,
    task_status: str = None,
    nurse_id: str = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """List all assigned tasks with optional filters."""
    query = db.query(ShiftAssignment, Nurse).join(
        Nurse, ShiftAssignment.nurse_id == Nurse.id
    ).filter(ShiftAssignment.task_title != None)

    if specialization:
        query = query.filter(ShiftAssignment.specialization_required.ilike(f"%{specialization}%"))
    if task_status:
        query = query.filter(ShiftAssignment.task_status == task_status)
    if nurse_id:
        query = query.filter(ShiftAssignment.nurse_id == nurse_id)

    rows = query.order_by(ShiftAssignment.shift_date.desc()).all()
    return [
        {
            "id":             str(t.id),
            "nurse_id":       str(t.nurse_id),
            "nurse_name":     n.full_name,
            "specialization": n.specialization or "General",
            "task_title":     t.task_title,
            "task_type":      t.task_type,
            "priority":       t.priority or "routine",
            "ward":           t.ward or t.location,
            "floor":          t.floor_location,
            "shift_date":     str(t.shift_date),
            "shift_time":     t.shift_time,
            "task_notes":     t.task_notes,
            "status":         t.task_status or "assigned",
            "assigned_by":    t.assigned_by,
        }
        for t, n in rows
    ]


# ========== HOSPITAL ADMIN MANAGEMENT (Platform Admin only) ==========

@router.post("/hospital-admins/create")
def create_hospital_admin(
    data: dict,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user),
    background_tasks: BackgroundTasks = None
):
    """Super admin creates a hospital admin account."""
    # Only platform_admin can create hospital admins
    if current_admin.get("admin_role", "platform_admin") != "platform_admin":
        raise HTTPException(403, "Only the Platform Admin can create Hospital Admin accounts")

    email         = (data.get("email") or "").strip()
    full_name     = (data.get("full_name") or "").strip()
    hospital_name = (data.get("hospital_name") or "").strip()

    if not email or not full_name or not hospital_name:
        raise HTTPException(400, "email, full_name, and hospital_name are required")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    # Generate 15-char password: letters + digits + symbols
    _chars = _string.ascii_letters + _string.digits + "!@#$%^&*()-_=+"
    plain_password = ''.join(secrets.choice(_chars) for _ in range(15))

    # Look up hospital_id by name so the account is linked to the hospitals table
    matched_hospital = db.query(Hospital).filter(Hospital.name.ilike(hospital_name)).first()
    resolved_hospital_id = matched_hospital.id if matched_hospital else None

    hospital_admin = User(
        email               = email,
        password            = hash_password(plain_password),
        role                = "admin",
        admin_role          = "hospital_admin",
        hospital_id         = resolved_hospital_id,
        hospital_name       = hospital_name,
        full_name           = full_name,
        is_active           = False,          # Pending verification by Platform Admin
        must_reset_password = True,
    )
    db.add(hospital_admin)
    db.commit()
    db.refresh(hospital_admin)

    log_admin_action(db, current_admin["id"], "HOSPITAL_ADMIN_CREATED", 
        details=f"{full_name} | {hospital_name} (ID: {hospital_admin.id})")

    return {
        "id":            str(hospital_admin.id),
        "email":         hospital_admin.email,
        "full_name":     hospital_admin.full_name,
        "hospital_name": hospital_admin.hospital_name,
        "is_active":     hospital_admin.is_active,
        "status":        "active" if hospital_admin.is_active else "pending",
        "temp_password": plain_password,
        "message":       f"Hospital Admin account created for {full_name} at {hospital_name}. Pending activation.",
    }


@router.get("/hospital-admins")
def list_hospital_admins(
    status: str = None,
    admin_role: str = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Platform admin lists hospital admin / dept head accounts.
    Optional filters: status (active/pending/deactivated), admin_role (hospital_admin/dept_head)."""
    query = db.query(User).filter(
        User.admin_role.in_(["hospital_admin", "dept_head"])
    )

    if admin_role:
        query = query.filter(User.admin_role == admin_role)

    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "deactivated":
        query = query.filter(User.is_active == False)
    elif status == "pending":
        query = query.filter(User.is_active == None)

    admins = query.order_by(User.full_name).all()
    return [
        {
            "id":                  str(a.id),
            "email":               a.email,
            "full_name":           a.full_name or a.email,
            "hospital_name":       a.hospital_name or "—",
            "admin_role":          a.admin_role,
            "department":          a.department or None,
            "is_active":           a.is_active is not False,
            "status":              "active" if (a.is_active is not False) else ("deactivated" if a.deactivation_reason else "pending"),
            "deactivation_reason": a.deactivation_reason or None,
        }
        for a in admins
    ]


@router.post("/hospital-admins/{admin_id}/toggle-active")
def toggle_hospital_admin_active(
    admin_id: str,
    data: dict = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    """Platform admin activates or deactivates a hospital admin / dept head.
    When deactivating, a reason must be provided."""
    if current_admin.get("admin_role", "platform_admin") != "platform_admin":
        raise HTTPException(403, "Only the Platform Admin can manage account status")

    import uuid as _uuid
    target = db.query(User).filter(User.id == _uuid.UUID(admin_id)).first()
    if not target:
        raise HTTPException(404, "Admin account not found")
    if target.admin_role == "platform_admin":
        raise HTTPException(403, "Cannot deactivate the Platform Admin")

    new_status = not (target.is_active if target.is_active is not None else True)
    target.is_active = new_status

    if new_status:
        # Activating — set must_reset_password so they reset on next login
        target.must_reset_password = True
        target.deactivation_reason = None
        action = "ADMIN_ACTIVATED"
        log_details = f"Activated | {target.full_name} | {target.hospital_name or target.department}"
    else:
        # Deactivating — reason is required
        reason = (data or {}).get("reason", "").strip()
        if not reason:
            raise HTTPException(400, "Deactivation reason is required")
        target.deactivation_reason = reason
        action = "ADMIN_DEACTIVATED"
        log_details = f"Deactivated | {target.full_name} | {target.hospital_name or target.department} | Reason: {reason}"

    db.commit()

    log_admin_action(db, current_admin["id"], action, details=log_details)

    return {
        "id":        admin_id,
        "is_active": new_status,
        "status":    "active" if new_status else "deactivated",
        "message":   f"Account {'activated' if new_status else 'deactivated'} for {target.full_name}",
    }

