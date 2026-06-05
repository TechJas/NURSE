# -*- coding: utf-8 -*-
"""
Migration script to add new columns to existing tables.
Run this once after updating models.py.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database.session import engine
from sqlalchemy import text

def add_column(engine, table, column, col_type):
    """Add a column safely, ignoring if it already exists."""
    with engine.connect() as conn:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            conn.commit()
            print(f"OK: {table}.{column} added")
        except Exception as e:
            conn.rollback()
            print(f"SKIP: {table}.{column} already exists or error: {type(e).__name__}")

def migrate():
    # Nurse table: existing columns
    add_column(engine, "nurses", "shift_unlocked",     "BOOLEAN DEFAULT FALSE")
    add_column(engine, "nurses", "unlock_key_hash",    "VARCHAR")

    # Nurse table: new CARE ID columns
    add_column(engine, "nurses", "care_id",              "VARCHAR")
    add_column(engine, "nurses", "care_id_verified",     "BOOLEAN DEFAULT FALSE")
    add_column(engine, "nurses", "care_id_email_sent",   "BOOLEAN DEFAULT FALSE")
    add_column(engine, "nurses", "care_id_attempts",     "INTEGER DEFAULT 0")
    add_column(engine, "nurses", "care_id_locked_until", "TIMESTAMP")

    # Create all new tables (VenueMaster + any others from models)
    from app.database.base import Base
    from app.database import models  # noqa
    Base.metadata.create_all(bind=engine)
    print("OK: All tables created/verified (including venue_master)")

if __name__ == "__main__":
    migrate()
    print("\nMigration complete!")
