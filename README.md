# Carenium · Nurse Registration & KYC Onboarding Platform

> **Designed & Developed by Jasmin Banu M.**

A secure, role-based healthcare staffing platform for nurse registration, KYC verification, document management, interview scheduling, and onboarding — with separate portals for nurses, hospital admins, department heads, and platform administrators.

---

## Overview

**Carenium** digitises the full nurse-onboarding journey. Candidates register and submit KYC documents, platform admins review and verify them, interviews are scheduled across hospital venues, and approved nurses receive a system-generated ID and working-shift access. Every role has its own dedicated dashboard, and all root functionality stays consistent through one secure FastAPI + React backend.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11 · FastAPI · SQLAlchemy 2 · Pydantic v2 |
| **Frontend** | React 19 · Vite · React Router · Axios · React Hook Form |
| **Database** | PostgreSQL (SQLite for local dev) |
| **Auth** | JWT (python-jose) · bcrypt password hashing |
| **Emails** | Resend · Jinja2 templates |
| **Extras** | ReportLab (PDF export) · python-docx (DOCX export) |

---

## Features

### Nurse Portal
- Registration, sign-in, and secure JWT-authenticated access
- First-login password setup and role-based profile settings
- KYC document upload with status tracking
- Requests, working-shift, and duty management
- System-generated nurse ID card

### Platform Admin Portal
- KYC document review, approval, and rejection
- Interview scheduling with hospital-venue selection (CSV venue import)
- System ID generation and bulk email delivery (CARE ID unlock)
- Nurse registry, hospital-admin management, and overview dashboard

### Hospital Admin Portal
- Hospital-scoped nurse registry, tasks, department heads, and dept-management
- Onboarding and approval workflows scoped to their hospital

### Department Head Portal
- Nurse registry and task management scoped to their department

### Security
- Direct **bcrypt** password hashing (not passlib's deprecated format)
- JWT-based authentication with configurable expiry
- UUID-protected document resources
- Rate limiting and input validation

---

## Getting Started

### 1. Requirements
- Python 3.11+
- Node.js 18+ (for the frontend)
- PostgreSQL (optional — SQLite works for local development)

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and fill in your own values (see **Environment Variables** below):

```bash
cp backend/.env.example backend/.env
```

### 3. Initialize the database

```bash
python create_admin_tables.py
```

### 4. Run the backend

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8008
```

### 5. Run the frontend (optional — React build)

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Copy the template below into `backend/.env` and fill in your own values.

```env
# Core
SECRET_KEY="your-random-secret-key"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=postgresql://user:password@host:port/dbname   # or sqlite:///./dev.db

# Email (Resend)
MAIL_FROM=onboarding@resend.dev
MAIL_FROM_NAME="Carenium"
RESEND_API_KEY=your-resend-api-key

# Supabase Storage (optional)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=
```

> Set every value yourself. Never commit `.env` to version control.

---

## Access the Portals

With the backend running:

- **Nurse Portal** — `http://127.0.0.1:8008/`
- **Admin Portal** — `http://127.0.0.1:8008/admin-portal`

Or via the React frontend dev server (routes are defined in `frontend/src/App.jsx`).

---

## Project Structure

```
.
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── core/         # Config, security, email
│   │   ├── database/     # Models, session, base
│   │   ├── routers/      # auth, admin, nurse, documents, export, etc.
│   │   ├── schemas/      # Pydantic request/response models
│   │   ├── services/     # admin, nurse, document logic
│   │   ├── storage/      # File storage abstraction
│   │   ├── templates/    # Email HTML templates
│   │   └── main.py       # FastAPI entrypoint
│   ├── requirements.txt
│   └── create_admin_tables.py
├── frontend/             # React (Vite) single-page app
│   └── src/
│       ├── pages/        # All role dashboards & auth pages
│       ├── components/   # Shared UI (ID card, notification panel, etc.)
│       ├── contexts/     # Auth context
│       ├── api/          # Axios instance & endpoints
│       └── layouts/      # App & auth layouts
├── Logo/                 # Brand assets
├── PRD.md                # Product requirements
├── DESIGN.md             # Design spec
└── README.md
```

---

## Security Warning

**NEVER** share your `.env` file, commit it to Git, or include it in shared ZIP files. It holds your database credentials, JWT secret, and email API keys.

---

Designed & Developed by **Jasmin Banu M.**
