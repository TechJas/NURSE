# 🚀 Quick Start Guide - Healthcare Admin Portal

## Prerequisites

- Python 3.8+
- PostgreSQL database
- FastAPI backend running

## Setup Steps

### 1. Run Database Migration

```powershell
cd c:\Users\jasmi\Downloads\nurse\backend
python create_admin_tables.py
```

### 2. Start the Server

```powershell
uvicorn app.main:app --reload
```

### 3. Access Admin Portal

Open browser: `http://localhost:8000/admin-portal`

## First Time Setup

### Add Sample Hospital

Use API or database to add a hospital:

```sql
INSERT INTO hospitals (id, name, location, city, state)
VALUES (gen_random_uuid(), 'City General Hospital', '123 Main St', 'Mumbai', 'Maharashtra');
```

### Test the Workflow

1. **KYC Verification** → Go to KYC page → Review & Approve a nurse
2. **Schedule Interview** → Go to Interviews → Click "Schedule New Interview"
3. **Mark Result** → After interview → Click "Pass" button
4. **Assign Position** → Go to Allocation → Click "Assign Position"
5. **View Active** → Check Active Nurses page

## Troubleshooting

**Issue: Admin portal not loading**

- Check if FastAPI server is running
- Verify static files are mounted correctly
- Check browser console for errors

**Issue: API calls failing**

- Ensure database tables are created
- Check admin authentication is configured
- Verify CORS settings if needed

**Issue: No nurses showing**

- Add test nurses through nurse registration
- Or add directly to database for testing

## API Documentation

Visit: `http://localhost:8000/docs` for interactive API documentation

---

For detailed information, see `walkthrough.md`
