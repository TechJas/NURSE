from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Form
from sqlalchemy.orm import Session
from datetime import date as DateType
from typing import Optional

from app.database.session import SessionLocal
from app.database.models import NurseDocument, Nurse
from app.utils.file_handler import save_file
from app.utils.validators import get_current_nurse_user

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/my-documents")
def get_my_documents(
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """Return all uploaded documents for the logged-in nurse, including re-upload flags and expiry."""
    nurse_id = current_nurse["id"]
    docs = db.query(NurseDocument).filter(NurseDocument.nurse_id == nurse_id).all()
    return [
        {
            "id":                 str(doc.id),
            "document_type":      doc.document_type,
            "file_path":          doc.file_path,
            "is_verified":        doc.is_verified,
            "reupload_requested": doc.reupload_requested or False,
            "reupload_reason":    doc.reupload_reason,
            "expiry_date":        str(doc.expiry_date) if doc.expiry_date else None,
            "is_expired":         (doc.expiry_date is not None and doc.expiry_date < DateType.today()),
            "uploaded_at":        doc.uploaded_at,
        }
        for doc in docs
    ]


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    expiry_date: Optional[str] = Form(None),   # ISO date string e.g. "2027-03-15"
    db: Session = Depends(get_db),
    current_nurse: dict = Depends(get_current_nurse_user)
):
    """
    Nurse uploads a document.
    - First upload: accepted freely.
    - Re-upload: only allowed if admin flagged it OR the document is expired.
    - On re-upload: resets reupload_requested flag, resets nurse KYC to pending for admin re-review.
    """
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, PNG allowed.")

    nurse_id = current_nurse["id"]

    existing = db.query(NurseDocument).filter(
        NurseDocument.nurse_id == nurse_id,
        NurseDocument.document_type == document_type
    ).first()

    is_expired = (
        existing is not None
        and existing.expiry_date is not None
        and existing.expiry_date < DateType.today()
    )
    is_flagged = existing is not None and (existing.reupload_requested or False)

    # Block re-upload unless admin flagged it or it has expired
    if existing and not is_flagged and not is_expired:
        raise HTTPException(
            status_code=400,
            detail="Document already uploaded. Re-upload is only allowed when admin requests it or the document has expired."
        )

    # Parse expiry date if provided
    parsed_expiry = None
    if expiry_date:
        try:
            parsed_expiry = DateType.fromisoformat(expiry_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expiry date format. Use YYYY-MM-DD.")

    file_path = save_file(file, nurse_id)

    if existing:
        # ── RE-UPLOAD: update the existing record ─────────────────────────
        existing.file_path          = file_path
        existing.is_verified        = False          # must be re-verified by admin
        existing.reupload_requested = False          # clear the flag
        existing.reupload_reason    = None
        if parsed_expiry:
            existing.expiry_date = parsed_expiry

        # Reset nurse KYC status so admin sees it for re-review
        nurse = db.query(Nurse).filter(Nurse.id == nurse_id).first()
        if nurse:
            nurse.is_verified = False                # triggers "KYC Review Required" on admin side

        db.commit()
        return {
            "status":      "Re-uploaded",
            "document_id": str(existing.id),
            "verified":    False,
            "message":     "Document replaced. Admin will review and re-approve your KYC.",
        }
    else:
        # ── FIRST UPLOAD ──────────────────────────────────────────────────
        doc = NurseDocument(
            nurse_id      = nurse_id,
            document_type = document_type,
            file_path     = file_path,
            is_verified   = False,
            expiry_date   = parsed_expiry,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return {
            "status":      "Uploaded",
            "document_id": str(doc.id),
            "verified":    False,
        }
