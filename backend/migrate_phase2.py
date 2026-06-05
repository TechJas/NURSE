import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role VARCHAR DEFAULT 'platform_admin'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id UUID",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_name VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR",
    ]
    for sql in migrations:
        db.execute(text(sql))
    db.commit()
    print("Migration complete. User table columns:")
    r = db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='users' ORDER BY ordinal_position"
    ))
    for row in r:
        print(" -", row[0])
except Exception as e:
    db.rollback()
    print("ERROR:", e)
finally:
    db.close()
