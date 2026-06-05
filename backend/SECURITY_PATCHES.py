"""
CRITICAL SECURITY PATCHES - Apply Immediately

This file contains the most critical security fixes that must be applied
before deploying to production. These patches address:
1. XSS vulnerabilities
2. Missing authentication
3. Input validation
4. UUID validation

Apply these patches in order.
"""

# ============================================================
# PATCH 1: XSS Protection - Frontend Sanitization
# ============================================================
# File: app/static/admin/app.js
# Add this function at the top of the file, after line 14

XSS_PROTECTION = """
// ========== SECURITY: XSS PROTECTION ==========
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Secure version of getStatusBadge
function getStatusBadge(status) {
    const statusMap = {
        PENDING: "badge-warning",
        SCHEDULED: "badge-info",
        PASSED: "badge-success",
        FAILED: "badge-danger",
        ON_HOLD: "badge-warning",
        ACTIVE: "badge-success",
        COMPLETED: "badge-info",
        TERMINATED: "badge-danger",
    };
    
    const safeStatus = escapeHtml(status);
    const badgeClass = statusMap[status] || "badge-info";
    return `<span class="badge ${badgeClass}">${safeStatus.replace("_", " ")}</span>`;
}
"""

# THEN UPDATE ALL RENDERING FUNCTIONS:
# Replace: ${nurse.full_name}
# With: ${escapeHtml(nurse.full_name)}

# ============================================================
# PATCH 2: Authentication Token Implementation
# ============================================================
# File: app/static/admin/app.js
# Replace the apiCall function (lines 86-110) with:

AUTH_TOKEN_FIX = """
// ========== SECURITY: AUTHENTICATION ==========
async function apiCall(endpoint, method = "GET", data = null) {
    const token = localStorage.getItem('admin_token');
    
    if (!token && endpoint !== '/auth/login') {
        window.location.href = '/admin/login';
        throw new Error('Not authenticated');
    }
    
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
    };
    
    if (data && method !== "GET") {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '/admin/login';
            throw new Error('Session expired');
        }
        
        if (!response.ok) {
            console.error('API Error:', response.status);
            throw new Error('An error occurred. Please try again.');
        }
        
        return await response.json();
    } catch (error) {
        console.error("API call failed:", error);
        showToast('An error occurred. Please try again.', 5000);
        throw error;
    }
}

// Add logout function
function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
}
"""

# ============================================================
# PATCH 3: UUID Validation - Backend
# ============================================================
# File: app/routers/admin.py
# Add this helper function after line 46:

UUID_VALIDATION = """
from uuid import UUID

def validate_uuid(uuid_string: str, field_name: str = "ID") -> UUID:
    '''Validate and convert string to UUID, raise 400 if invalid'''
    try:
        return UUID(uuid_string)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format"
        )
"""

# THEN UPDATE ALL ENDPOINTS TO USE IT:
# Example for verify_nurse endpoint (line 72-96):

SECURE_VERIFY_ENDPOINT = """
@router.post("/nurses/{nurse_id}/verify")
def verify_nurse(
    nurse_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    # SECURITY: Validate UUID
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")
    
    previous_status = "Unverified" if not nurse.is_verified else "Verified"
    
    nurse.is_verified = True
    nurse.is_active = True
    db.commit()
    db.refresh(nurse)
    
    log_admin_action(db, current_admin["id"], "KYC_APPROVED", str(nurse_uuid), previous_status, "Verified")
    send_verification_email(nurse.email, nurse.full_name)
    
    return {"message": f"Nurse {nurse.full_name} verified successfully. Ready for interview scheduling."}
"""

# ============================================================
# PATCH 4: Input Validation with Pydantic
# ============================================================
# File: app/schemas/admin.py (CREATE THIS FILE)

INPUT_VALIDATION_SCHEMAS = """
from pydantic import BaseModel, Field, validator
import re

class RejectKYCRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)
    
    @validator('reason')
    def validate_reason(cls, v):
        if not v.strip():
            raise ValueError('Reason cannot be empty')
        # Remove HTML tags
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML tags not allowed')
        return v.strip()

class RequestReuploadRequest(BaseModel):
    document_type: str = Field(..., min_length=2, max_length=100)
    reason: str = Field(..., min_length=10, max_length=500)
    
    @validator('document_type', 'reason')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Field cannot be empty')
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML tags not allowed')
        return v.strip()

class SearchNurseRequest(BaseModel):
    registration_number: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    
    @validator('registration_number', 'email')
    def validate_search(cls, v):
        if v and re.search(r'[<>\'";]', v):
            raise ValueError('Invalid characters in search query')
        return v
"""

# UPDATE reject_nurse endpoint to use it:
SECURE_REJECT_ENDPOINT = """
from app.schemas.admin import RejectKYCRequest

@router.post("/nurses/{nurse_id}/reject")
def reject_nurse(
    nurse_id: str,
    data: RejectKYCRequest,  # CHANGED: Now uses Pydantic model
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_user)
):
    nurse_uuid = validate_uuid(nurse_id, "Nurse ID")
    nurse = db.query(Nurse).filter(Nurse.id == nurse_uuid).first()
    if not nurse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse not found")
    
    nurse.is_verified = False
    nurse.is_active = False
    nurse.rejection_reason = data.reason  # Already validated by Pydantic
    db.commit()
    
    log_admin_action(db, current_admin["id"], "KYC_REJECTED", str(nurse_uuid), details=data.reason)
    
    return {"message": f"Nurse {nurse.full_name} KYC rejected.", "reason": data.reason}
"""

# ============================================================
# PATCH 5: Rate Limiting
# ============================================================
# File: requirements.txt - ADD:
REQUIREMENTS_ADD = """
slowapi==0.1.9
"""

# File: app/main.py - ADD:
RATE_LIMITING_SETUP = """
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
"""

# File: app/routers/admin.py - ADD to sensitive endpoints:
RATE_LIMIT_EXAMPLE = """
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/nurses/{nurse_id}/verify")
@limiter.limit("10/minute")  # Max 10 verifications per minute
def verify_nurse(...):
    pass
"""

# ============================================================
# PATCH 6: Security Headers Middleware
# ============================================================
# File: app/main.py - ADD:

SECURITY_HEADERS = """
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    
    # Prevent XSS
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
    )
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Enable XSS filter
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # HTTPS only (in production)
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
"""

print("=" * 60)
print("CRITICAL SECURITY PATCHES")
print("=" * 60)
print("\nThese patches MUST be applied before production deployment.")
print("\nPriority Order:")
print("1. XSS Protection (Frontend)")
print("2. Authentication Token (Frontend)")
print("3. UUID Validation (Backend)")
print("4. Input Validation (Backend)")
print("5. Rate Limiting (Backend)")
print("6. Security Headers (Backend)")
print("\nEstimated time to apply all patches: 4-6 hours")
print("\nSee SECURITY_AUDIT.md for detailed explanations.")
print("=" * 60)
