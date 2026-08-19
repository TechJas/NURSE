from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import logging

from app.database.session import SessionLocal
from app.database.models import Nurse, User
from app.schemas.auth import Token, LoginRequest, ChangePasswordRequest
from app.core.security import verify_password, create_access_token, hash_password
from app.utils.validators import oauth2_scheme, decode_token
from app.core.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── In-memory OTP store ─────────────────────────────────────────────────────
otp_store = {}  # email -> {"code": str, "expires_at": datetime}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Helpers ─────────────────────────────────────────────────────────────────
def _get_user(db: Session, email: str, role: str):
    if role == "nurse":
        return db.query(Nurse).filter(Nurse.email == email).first()
    return db.query(User).filter(User.email == email).first()


# ── Login ───────────────────────────────────────────────────────────────────
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for email: '{data.email}'")

    user = db.query(Nurse).filter(Nurse.email == data.email).first()
    role = "nurse"

    if not user:
        user = db.query(User).filter(User.email == data.email).first()
        role = "admin"

    if not user:
        logger.warning(f"No user found for email: '{data.email}'")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password):
        logger.warning(f"Wrong password for email: '{data.email}'")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Block deactivated admin accounts
    if role == "admin":
        is_active = getattr(user, "is_active", True)
        if is_active is False:
            logger.warning(f"Deactivated admin login blocked: '{data.email}'")
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact Platform Admin.")

    # Check if password reset is required (admin accounts with temp passwords)
    must_reset = False
    if role == "admin":
        must_reset = getattr(user, "must_reset_password", False) or False

    # Build token payload
    token_payload = {
        "sub":  user.email,
        "id":   str(user.id),
        "role": role,
    }

    if role == "nurse":
        is_full = getattr(user, "care_id_verified", False) or False
        token_payload["access_level"]     = "full" if is_full else "restricted"
        token_payload["shift_unlocked"]   = getattr(user, "shift_unlocked", False) or False
        token_payload["care_id_verified"] = is_full
        token_payload["full_name"]        = user.full_name or user.email

    elif role == "admin":
        admin_role    = getattr(user, "admin_role", "platform_admin") or "platform_admin"
        hospital_id   = str(user.hospital_id) if user.hospital_id else None
        hospital_name = user.hospital_name or None

        token_payload["admin_role"]    = admin_role
        token_payload["hospital_id"]   = hospital_id
        token_payload["hospital_name"] = hospital_name
        token_payload["full_name"]     = user.full_name or user.email
        token_payload["department"]    = user.department or None

    token = create_access_token(token_payload)
    logger.info(f"Login successful for: '{data.email}' role={role}")
    return {
        "access_token":        token,
        "token_type":          "bearer",
        "must_reset_password": must_reset,
    }


# ── First-login password reset (no OTP required) ────────────────────────────
@router.post("/reset-password")
def reset_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    """Used after first login with a temp password. No OTP needed."""
    payload = decode_token(token)
    email  = payload.get("sub")
    role   = payload.get("role")

    user = _get_user(db, email, role)
    if not user:
        raise HTTPException(400, "User not found")

    if role != "admin" or not getattr(user, "must_reset_password", False):
        raise HTTPException(403, "This endpoint is only for first-time password reset")

    # If current_password is provided, verify it; otherwise skip (user logged in with JWT)
    if data.current_password and not verify_password(data.current_password, user.password):
        raise HTTPException(400, "Current password is incorrect")

    user.password          = hash_password(data.new_password)
    user.must_reset_password = False
    db.commit()

    logger.info(f"First-time password reset for '{email}'")
    return {"message": "Password set successfully. You can now access the dashboard."}


# ── Send OTP ────────────────────────────────────────────────────────────────
@router.post("/send-otp")
def send_otp(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    background_tasks: BackgroundTasks = None,
):
    """Send a 6-digit OTP to the authenticated user's email."""
    payload = decode_token(token)
    email  = payload.get("sub")
    role   = payload.get("role")

    user = _get_user(db, email, role)
    if not user:
        raise HTTPException(400, "User not found")

    code = str(random.randint(100000, 999999))
    otp_store[email] = {"code": code, "expires_at": datetime.utcnow() + timedelta(minutes=10)}
    logger.info(f"OTP for {email}: {code}")

    if background_tasks:
        background_tasks.add_task(
            send_email,
            email,
            "Your Password Change OTP — Carenium",
            "email/otp.html",
            {"otp": code, "name": getattr(user, "full_name", None) or email.split("@")[0]},
        )
    else:
        send_email(
            email,
            "Your Password Change OTP — Carenium",
            "email/otp.html",
            {"otp": code, "name": getattr(user, "full_name", None) or email.split("@")[0]},
        )

    return {"message": "OTP sent to your email"}


# ── Change password (OTP required) ─────────────────────────────────────────
@router.post("/change-password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    """Change password with OTP verification."""
    payload = decode_token(token)
    email  = payload.get("sub")
    role   = payload.get("role")

    user = _get_user(db, email, role)
    if not user:
        raise HTTPException(400, "User not found")

    current_password = data.get("current_password", "")
    new_password     = data.get("new_password", "")
    otp              = data.get("otp", "")

    if not current_password or not new_password or not otp:
        raise HTTPException(400, "current_password, new_password, and otp are required")

    if not verify_password(current_password, user.password):
        raise HTTPException(400, "Current password is incorrect")

    # Verify OTP
    stored = otp_store.get(email)
    if not stored:
        raise HTTPException(400, "No OTP requested. Please request a new OTP.")
    if stored["code"] != otp:
        raise HTTPException(400, "Invalid OTP")
    if datetime.utcnow() > stored["expires_at"]:
        del otp_store[email]
        raise HTTPException(400, "OTP has expired. Please request a new one.")

    del otp_store[email]
    user.password = hash_password(new_password)
    db.commit()

    logger.info(f"Password changed via OTP for '{email}'")
    return {"message": "Password updated successfully"}
