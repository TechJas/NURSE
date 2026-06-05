from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HospitalCreate(BaseModel):
    name: str
    location: str
    city: str
    state: str
    departments: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    departments: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class HospitalOut(BaseModel):
    id: str
    name: str
    location: str
    city: str
    state: str
    departments: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True
