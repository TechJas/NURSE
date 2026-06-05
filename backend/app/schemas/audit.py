from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogOut(BaseModel):
    id: str
    admin_id: str
    action_type: str
    nurse_id: Optional[str]
    previous_status: Optional[str]
    new_status: Optional[str]
    details: Optional[str]
    timestamp: datetime

    class Config:
        orm_mode = True
