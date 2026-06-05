"""
Migration: Add expiry_date column to nurse_documents table.
Safe to run multiple times.
"""
import psycopg2
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = False
cur = conn.cursor()

migrations = [
    ("nurse_documents.expiry_date",
     "ALTER TABLE nurse_documents ADD COLUMN expiry_date DATE"),
    ("nurse_documents.reupload_requested",
     "ALTER TABLE nurse_documents ADD COLUMN reupload_requested BOOLEAN DEFAULT FALSE"),
    ("nurse_documents.reupload_reason",
     "ALTER TABLE nurse_documents ADD COLUMN reupload_reason VARCHAR"),
]

for name, sql in migrations:
    try:
        cur.execute(sql)
        conn.commit()
        print(f"  OK - Added: {name}")
    except Exception as e:
        conn.rollback()
        if "already exists" in str(e):
            print(f"  SKIP - Already exists: {name}")
        else:
            print(f"  ERROR - {name}: {e}")

cur.close()
conn.close()
print("\nMigration complete.")
