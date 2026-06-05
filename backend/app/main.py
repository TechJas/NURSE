from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import date as DateType
from .routers import auth, nurse, documents, admin, notifications, hospital_admin, dept_head, export
from .database.base import Base
from .database.session import engine, SessionLocal
# Import all models so Base.metadata knows about them
from .database import models  # noqa: F401
from .database.models import NurseDocument, Notification

app = FastAPI(title="Nurse Registration Platform")

# Auto-create new tables on startup (does NOT alter existing tables)
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    _check_expired_documents()


def _check_expired_documents():
    """On every server start, auto-flag any nurse documents whose expiry_date has passed."""
    db = SessionLocal()
    try:
        today = DateType.today()
        expired_docs = db.query(NurseDocument).filter(
            NurseDocument.expiry_date != None,
            NurseDocument.expiry_date < today,
            NurseDocument.reupload_requested == False,
        ).all()

        for doc in expired_docs:
            doc.reupload_requested = True
            doc.reupload_reason    = "Your document has expired. Please upload a new copy."

            # Notify the nurse in-app
            notif = Notification(
                nurse_id = doc.nurse_id,
                title    = "Document Expired",
                message  = f"Your '{doc.document_type}' document has expired. Please re-upload it to stay active.",
                type     = "expiry_alert",
                is_read  = False,
            )
            db.add(notif)

        if expired_docs:
            db.commit()
            print(f"[Startup] Flagged {len(expired_docs)} expired document(s) for re-upload.")
    except Exception as e:
        db.rollback()
        print(f"[Startup] Expiry check failed: {e}")
    finally:
        db.close()

# CORS — allow React dev server (port 5173) to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://nurse-wvfe.onrender.com",
        "https://nurse.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SECURITY: Rate Limiting Setup
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# SECURITY: Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Prevent XSS attacks
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;"
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Enable XSS filter in browsers
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # HTTPS only (uncomment in production with HTTPS)
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Permissions policy
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    return response

# Mount static files for admin portal
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include routers
app.include_router(auth.router, tags=["Auth"])
app.include_router(nurse.router, tags=["Nurse"])
app.include_router(documents.router, tags=["Documents"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(notifications.router, tags=["Notifications"])
app.include_router(hospital_admin.router, tags=["Hospital Admin"])
app.include_router(dept_head.router, tags=["Dept Head"])
app.include_router(export.router, tags=["Export"])

@app.get("/")
def home():
    """Serve the nurse registration page by default"""
    return FileResponse("app/static/nurse/register.html")

@app.get("/login")
def nurse_login():
    """Serve the nurse login page"""
    return FileResponse("app/static/nurse/login.html")

@app.get("/dashboard")
def nurse_dashboard():
    """Serve the nurse dashboard"""
    return FileResponse("app/static/nurse/dashboard.html")

@app.get("/register")
def nurse_register():
    """Serve the nurse registration page"""
    return FileResponse("app/static/nurse/register.html")

# .html aliases — handles any cached or extension-mangled redirects
@app.get("/login.html")
def nurse_login_html():
    return FileResponse("app/static/nurse/login.html")

@app.get("/register.html")
def nurse_register_html():
    return FileResponse("app/static/nurse/register.html")

@app.get("/dashboard.html")
def nurse_dashboard_html():
    return FileResponse("app/static/nurse/dashboard.html")

@app.get("/admin-portal")
def admin_portal():
    """Serve the admin portal frontend"""
    return FileResponse("app/static/admin/index.html")
