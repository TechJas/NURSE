from pydantic import BaseModel, field_validator
from datetime import datetime, date
from typing import Optional
import uuid

class DocumentBase(BaseModel):
    document_type: str

class DocumentCreate(DocumentBase):
    pass

class NurseDocumentOut(BaseModel):
    id: str
    nurse_id: str
    document_type: str
    file_path: str
    is_verified: bool
    reupload_requested: Optional[bool] = False
    reupload_reason: Optional[str] = None
    expiry_date: Optional[date] = None
    uploaded_at: Optional[datetime] = None

    # Convert UUID objects to strings automatically
    @field_validator('id', 'nurse_id', mode='before')
    @classmethod
    def uuid_to_str(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True
