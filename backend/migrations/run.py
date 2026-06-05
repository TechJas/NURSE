"""Run all pending migrations."""
from sqlalchemy import create_engine, text
from app.core.config import settings
import sys

engine = create_engine(settings.DATABASE_URL)

# ── 1. deactivation_reason ──
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN deactivation_reason TEXT"))
        conn.commit()
        print("[OK] Added deactivation_reason column")
    except Exception as e:
        err = str(e).lower()
        if "already exists" in err or "duplicate column" in err:
            print("[OK] deactivation_reason already exists")
        else:
            print(f"[?] {e}")
    sys.stdout.flush()

# ── 2. [removed] working_locations migration was reverted — table kept for compatibility, not used ──
