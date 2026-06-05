import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Integer, Numeric, Text
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from app.database.base import Base

# UUID type that works with both SQLite and PostgreSQL
class UUID(TypeDecorator):
    """Platform-independent UUID type.
    
    Uses PostgreSQL's UUID type when available, otherwise uses CHAR(36) for SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)

class User(Base):
    __tablename__ = "users"

    id            = Column(UUID, primary_key=True, default=uuid.uuid4)
    email         = Column(String, unique=True, index=True, nullable=False)
    password      = Column(String, nullable=False)
    role          = Column(String, nullable=False)           # "admin" (legacy — kept for compat)
    admin_role    = Column(String, default="platform_admin") # "platform_admin" | "hospital_admin"
    hospital_id   = Column(UUID, nullable=True)              # FK to hospitals — set for hospital_admin
    hospital_name = Column(String, nullable=True)            # denormalised for speed
    department    = Column(String, nullable=True)            # for dept_head (Phase 3)
    full_name     = Column(String, nullable=True)            # display name
    is_active            = Column(Boolean, default=True)      # platform admin activates hospital admins
    must_reset_password   = Column(Boolean, default=False)     # force password reset on next login
    deactivation_reason   = Column(String, nullable=True)      # reason for deactivation

class Nurse(Base):
    __tablename__ = "nurses"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    registration_number = Column(String, unique=True, nullable=False)
    specialization = Column(String)
    password = Column(String, nullable=False)

    # Existing fields
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # New fields for admin workflow
    interview_status = Column(String, default="PENDING")  # PENDING, SCHEDULED, PASSED, FAILED, ON_HOLD
    position_id = Column(UUID, ForeignKey("positions.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    location_preference = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)

    # Onboarding pipeline fields
    shift_unlocked = Column(Boolean, default=False)
    unlock_key_hash = Column(String, nullable=True)

    # CARE ID fields
    care_id = Column(String, nullable=True)                    # plain CARE-2026-4821
    care_id_verified = Column(Boolean, default=False)          # True after one correct entry
    care_id_email_sent = Column(Boolean, default=False)        # True after first email dispatch
    care_id_attempts = Column(Integer, default=0)              # wrong attempt counter
    care_id_locked_until = Column(DateTime, nullable=True)     # 24hr lockout timestamp

class NurseDocument(Base):
    __tablename__ = "nurse_documents"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    nurse_id = Column(UUID, ForeignKey("nurses.id"), nullable=False)
    document_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    reupload_requested = Column(Boolean, default=False)    # admin flagged this doc
    reupload_reason = Column(String, nullable=True)         # reason shown to nurse
    expiry_date = Column(Date, nullable=True)               # for nursing license expiry tracking
    uploaded_at = Column(DateTime, server_default=func.now())

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    nurse_id = Column(UUID, ForeignKey("nurses.id"), nullable=False)
    interviewer_name = Column(String, nullable=False)
    interview_date = Column(DateTime, nullable=False)
    location = Column(String, nullable=False)
    status = Column(String, default="SCHEDULED")  # SCHEDULED, COMPLETED, CANCELLED
    result = Column(String, nullable=True)  # PASSED, FAILED, ON_HOLD
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    departments = Column(String, nullable=True)  # Comma-separated
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Position(Base):
    __tablename__ = "positions"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    nurse_id = Column(UUID, ForeignKey("nurses.id"), nullable=False)
    hospital_id = Column(UUID, ForeignKey("hospitals.id"), nullable=False)
    position_type = Column(String, nullable=False)  # Home Nurse, Hospital Staff Nurse, ICU Nurse, etc.
    salary = Column(Numeric(10, 2), nullable=False)
    shift = Column(String, nullable=False)  # Morning, Evening, Night, Rotational
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, COMPLETED, TERMINATED
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    action_type = Column(String, nullable=False)  # KYC_APPROVED, KYC_REJECTED, INTERVIEW_SCHEDULED, etc.
    nurse_id = Column(UUID, ForeignKey("nurses.id"), nullable=True)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    nurse_id = Column(UUID, ForeignKey("nurses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    # Types: kyc_approved, kyc_rejected, interview_scheduled,
    #        interview_passed, interview_failed, unlock_key_sent
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    venue_name = Column(String, nullable=False)
    venue_address = Column(String, nullable=True)
    interview_date = Column(Date, nullable=False)
    interview_time = Column(String, nullable=False)       # "10:00 AM"
    instructions = Column(Text, nullable=True)
    created_by = Column(UUID, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id                      = Column(UUID, primary_key=True, default=uuid.uuid4)
    nurse_id                = Column(UUID, ForeignKey("nurses.id"), nullable=False)
    shift_date              = Column(Date, nullable=False)
    shift_time              = Column(String, nullable=False)
    location                = Column(String, nullable=False)
    task_notes              = Column(Text, nullable=True)
    # ── Task detail fields ──────────────────────────────────────────
    task_title              = Column(String, nullable=True)        # "Emergency Triage Monitoring"
    task_type               = Column(String, nullable=True)        # "Emergency Response", "Patient Care" etc.
    priority                = Column(String, default="routine")    # "emergency" / "urgent" / "routine"
    ward                    = Column(String, nullable=True)        # "Emergency Ward, Block A"
    floor_location          = Column(String, nullable=True)        # "Ground Floor"
    task_status             = Column(String, default="assigned")   # "assigned" / "acknowledged" / "completed"
    specialization_required = Column(String, nullable=True)        # "Emergency"
    assigned_by             = Column(String, nullable=True)        # admin email
    created_at              = Column(DateTime, server_default=func.now())
    updated_at              = Column(DateTime, server_default=func.now(), onupdate=func.now())


class VenueMaster(Base):
    __tablename__ = "venue_master"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    venue_name = Column(String, nullable=False)
    room_number = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    block = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())
