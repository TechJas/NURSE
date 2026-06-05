"""
Admin-specific Pydantic schemas for input validation
SECURITY: These schemas validate and sanitize all admin input
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
import re

class RejectKYCRequest(BaseModel):
    """Schema for rejecting nurse KYC with validation"""
    reason: str = Field(..., min_length=10, max_length=500, description="Rejection reason")
    
    @validator('reason')
    def validate_reason(cls, v):
        if not v.strip():
            raise ValueError('Reason cannot be empty')
        # SECURITY: Remove HTML tags to prevent XSS
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML tags not allowed in reason')
        # SECURITY: Check for script tags
        if re.search(r'script|javascript|onerror|onclick', v, re.IGNORECASE):
            raise ValueError('Potentially malicious content detected')
        return v.strip()

class RequestReuploadRequest(BaseModel):
    """Schema for requesting document re-upload"""
    document_type: str = Field(..., min_length=2, max_length=100)
    reason: str = Field(..., min_length=10, max_length=500)
    
    @validator('document_type', 'reason')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Field cannot be empty')
        # SECURITY: Remove HTML tags
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML tags not allowed')
        # SECURITY: Check for script injection
        if re.search(r'script|javascript|onerror|onclick', v, re.IGNORECASE):
            raise ValueError('Potentially malicious content detected')
        return v.strip()

class SearchNurseRequest(BaseModel):
    """Schema for searching nurses with validation"""
    registration_number: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    
    @validator('registration_number', 'email')
    def validate_search(cls, v):
        if v is None:
            return v
        # SECURITY: Prevent SQL injection attempts
        if re.search(r'[<>\'";\\\\]', v):
            raise ValueError('Invalid characters in search query')
        # SECURITY: Prevent wildcard abuse
        if v.count('%') > 2 or v.count('_') > 5:
            raise ValueError('Too many wildcard characters')
        return v.strip() if v else v

class InterviewNotesUpdate(BaseModel):
    """Schema for updating interview notes"""
    notes: str = Field(..., max_length=1000)
    
    @validator('notes')
    def validate_notes(cls, v):
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML tags not allowed in notes')
        return v.strip()
