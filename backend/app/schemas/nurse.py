from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class NurseBase(BaseModel):
    full_name: str
    email: str
    phone: str
    age: int
    registration_number: str
    specialization: Optional[str] = None

class NurseCreate(NurseBase):
    password: str

class NurseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: Any
    full_name: Optional[str] = "Unknown"
    email: str
    phone: Optional[str] = "No Phone"
    age: Optional[int] = 0
    registration_number: Optional[str] = "N/A"
    specialization: Optional[str] = None
    is_verified: bool = False
    is_active: bool = False
    created_at: Optional[datetime] = None
    interview_status: str = "PENDING"
    position_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    location_preference: Optional[str] = None
    experience_years: Optional[int] = None
