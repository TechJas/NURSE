from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InterviewCreate(BaseModel):
    nurse_id: str
    interviewer_name: str
    interview_date: datetime
    location: str
    notes: Optional[str] = None

class InterviewUpdate(BaseModel):
    interviewer_name: Optional[str] = None
    interview_date: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class InterviewResultUpdate(BaseModel):
    result: str  # PASSED, FAILED, ON_HOLD
    notes: Optional[str] = None

class InterviewOut(BaseModel):
    id: str
    nurse_id: str
    interviewer_name: str
    interview_date: datetime
    location: str
    status: str
    result: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
