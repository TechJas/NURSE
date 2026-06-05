from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class PositionCreate(BaseModel):
    nurse_id: str
    hospital_id: str
    position_type: str
    salary: Decimal
    shift: str
    start_date: datetime
    end_date: Optional[datetime] = None

class PositionUpdate(BaseModel):
    hospital_id: Optional[str] = None
    position_type: Optional[str] = None
    salary: Optional[Decimal] = None
    shift: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None

class PositionOut(BaseModel):
    id: str
    nurse_id: str
    hospital_id: str
    position_type: str
    salary: Decimal
    shift: str
    start_date: datetime
    end_date: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
