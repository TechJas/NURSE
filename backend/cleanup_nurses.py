"""
Safe DB Cleanup Script — v4 (pure raw SQL, correct delete order)
Run from: c:\\Users\\jasmi\\Downloads\\nurse\\backend
Command:  ..\.venv\Scripts\python.exe cleanup_nurses.py
"""
import sys, os, shutil
sys.stdout.reconfigure(encoding='utf-8')

from app.database.session import SessionLocal
from sqlalchemy import text

EMAILS_TO_DELETE = [
    "puppy2907@gmail.com",
    "jasmin03banu@gmail.com",
    "ainas08678@gmail.com",
    "riya2024@gmail.com",
    "testnurse@example.com",
    "admin@carenium.com",
    "jennynurse2336@gmail.com",
    "testregister500@example.com",
]

db = SessionLocal()
try:
    print("\n=== Carenium DB Cleanup v4 ===\n")
    deleted_nurses = 0

    for email in EMAILS_TO_DELETE:
        # Get nurse id
        row = db.execute(
            text("SELECT id, full_name FROM nurses WHERE email = :email"),
            {"email": email}
        ).fetchone()

        if not row:
            print(f"  SKIP   {email}  — not found in DB")
            continue

        nid       = str(row[0])
        full_name = row[1]
        print(f"  Processing: {full_name} ({email})")

        # 1. Get file_paths before deleting records
        doc_rows = db.execute(
            text("SELECT file_path FROM nurse_documents WHERE nurse_id = :id"),
            {"id": nid}
        ).fetchall()

        # 2. Delete physical files
        for doc_row in doc_rows:
            fp = doc_row[0]
            if fp and os.path.exists(fp):
                os.remove(fp)
                print(f"    FILE deleted: {fp}")

        # Remove nurse's upload folder from disk
        if os.path.isdir(nid):
            shutil.rmtree(nid)
            print(f"    FOLDER deleted: {nid}/")

        # 3. Delete all linked records in correct order (children first)
        db.execute(text("DELETE FROM nurse_documents  WHERE nurse_id = :id"), {"id": nid})
        db.execute(text("DELETE FROM interviews        WHERE nurse_id = :id"), {"id": nid})
        db.execute(text("DELETE FROM notifications     WHERE nurse_id = :id"), {"id": nid})
        db.execute(text("DELETE FROM audit_logs        WHERE nurse_id = :id"), {"id": nid})
        db.execute(text("DELETE FROM shift_assignments WHERE nurse_id = :id"), {"id": nid})

        # 4. Finally delete the nurse
        db.execute(text("DELETE FROM nurses WHERE id = :id"), {"id": nid})

        # Flush after each nurse so constraints are respected
        db.flush()

        deleted_nurses += 1
        if doc_rows:
            print(f"    {len(doc_rows)} document(s) removed")
        print(f"  ✅ DELETED\n")

    # Commit all at once at the end
    db.commit()

    print(f"=== Cleanup Complete ===")
    print(f"  Total nurses deleted: {deleted_nurses}\n")

    # Show who remains
    remaining = db.execute(text(
        "SELECT n.full_name, n.email, n.is_verified, COUNT(d.id) as doc_count "
        "FROM nurses n LEFT JOIN nurse_documents d ON d.nurse_id = n.id "
        "GROUP BY n.id, n.full_name, n.email, n.is_verified "
        "ORDER BY n.full_name"
    )).fetchall()

    print(f"  Remaining nurses ({len(remaining)}):")
    for r in remaining:
        verified = "✅ KYC OK" if r[2] else "⏳ Pending"
        print(f"    • {r[0]:20s}  {r[1]:35s}  docs={r[3]}  {verified}")

except Exception as e:
    db.rollback()
    print(f"\n❌ ERROR: {e}")
    print("No changes were saved.")
finally:
    db.close()
