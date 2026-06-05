import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    migrations = [
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS task_title VARCHAR",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS task_type VARCHAR",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'routine'",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS ward VARCHAR",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS floor VARCHAR",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'assigned'",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS specialization_required VARCHAR",
        "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS assigned_by VARCHAR",
    ]
    for sql in migrations:
        db.execute(text(sql))
    db.commit()
    print("Migration complete. Columns:")
    r = db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='shift_assignments' ORDER BY ordinal_position"
    ))
    for row in r:
        print(" -", row[0])
except Exception as e:
    db.rollback()
    print("ERROR:", e)
finally:
    db.close()
