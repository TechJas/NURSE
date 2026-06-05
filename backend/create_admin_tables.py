"""
Database Migration Script for Admin Portal Features

This script creates the new tables needed for the admin portal:
- interviews
- hospitals
- positions
- audit_logs

And adds new columns to the nurses table.

Run this after updating models.py
"""

from app.database.session import engine
from app.database.base import Base
from app.database.models import Nurse, Interview, Hospital, Position, AuditLog

def create_tables():
    """Create all tables in the database"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] All tables created successfully!")
    print("\nCreated tables:")
    print("  - interviews")
    print("  - hospitals")
    print("  - positions")
    print("  - audit_logs")
    print("  - Updated nurses table with new columns")

if __name__ == "__main__":
    create_tables()
