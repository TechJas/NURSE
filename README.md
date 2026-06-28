# MediLogistics - Nurse Registration Platform

A professional and secure platform for nursing staff registration, KYC verification, and onboarding management.

## Features

- **Nurse Portal**: Premium interface for registration, login, and document uploads.
- **Admin Portal**: Dashboard for reviewing KYC documents, scheduling interviews, and managing approvals.
- **Async Email Service**: Automated, non-blocking email notifications (Welcome, Verified, Activation).
- **Security**: Direct `bcrypt` password hashing, JWT-based authentication, and UUID-protected resources.

## Quick Start Setup

### 1. Requirements

Ensure you have Python 3.10+ installed.

```bash
pip install -r backend/requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory. Use the following template:

```env
SECRET_KEY="your-random-secret-key"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./dev.db

# Email Settings (Optional for local testing)
MAIL_USERNAME=your-smtp-user
MAIL_PASSWORD=your-smtp-pass
MAIL_FROM=noreply@example.com
MAIL_PORT=587
MAIL_SERVER=smtp.example.net
```

### 3. Initialize Database

Run the following script to create the necessary tables:

```bash
cd backend
python create_admin_tables.py
```

### 4. Run the Application

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8008
```

Access the portals at:

- **Nurse Portal**: [http://127.0.0.1:8008/](http://127.0.0.1:8008/)
- **Admin Portal**: [http://127.0.0.1:8008/admin-portal](http://127.0.0.1:8008/admin-portal)

## Security Warning

**NEVER** share your `.env` file or include it in version control (Git) or shared ZIP files. It contains your private database credentials and secret keys.
