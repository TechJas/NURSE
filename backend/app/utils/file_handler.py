import os
import uuid
from fastapi import UploadFile, HTTPException
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET       = os.getenv("SUPABASE_BUCKET", "nurse_documents")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

_bucket_checked = False


def _ensure_bucket_exists():
    """Auto-create the Supabase storage bucket once."""
    global _bucket_checked
    if _bucket_checked:
        return
    try:
        existing = supabase.storage.list_buckets()
        bucket_names = [b.name for b in existing]
        if BUCKET not in bucket_names:
            supabase.storage.create_bucket(
                BUCKET,
                options={"public": False}
            )
        _bucket_checked = True
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Storage bucket setup failed: {str(e)}"
        )


def save_file(file: UploadFile, nurse_id: str) -> str:
    """
    Upload file to PRIVATE Supabase Storage bucket.
    Auto-creates the bucket if it does not exist.
    Returns the storage path (not a public URL).
    Files are stored under: nurse_documents/{nurse_id}/{uuid}.{ext}
    """
    # Ensure bucket exists before uploading
    _ensure_bucket_exists()

    try:
        # Get file extension safely
        original_name = file.filename or "file"
        ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "bin"

        # Unique filename to prevent collisions
        unique_name  = f"{uuid.uuid4()}.{ext}"
        storage_path = f"{nurse_id}/{unique_name}"

        # Read file contents
        contents = file.file.read()

        # Upload to Supabase Storage (private bucket)
        supabase.storage.from_(BUCKET).upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type or "application/octet-stream"}
        )

        # Return only the storage path — NOT a public URL
        # Access is controlled via signed URLs (admin only)
        return storage_path

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


def get_signed_url(file_path: str, expires_in: int = 3600) -> str:
    """
    Generate a temporary signed URL for a stored file.
    Only call this from admin-protected routes.
    expires_in: seconds the link stays valid (default 1 hour)
    """
    try:
        response = supabase.storage.from_(BUCKET).create_signed_url(
            path=file_path,
            expires_in=expires_in
        )
        return response.get("signedURL") or response.get("signedUrl", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate signed URL: {str(e)}")
