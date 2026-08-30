# Carenium Nurse Portal — Project Report

**Version:** 1.0  
**Date:** July 2026  
**Prepared by:** Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [User Roles & Features](#6-user-roles--features)
7. [Database Design](#7-database-design)
8. [Entity Relationships](#8-entity-relationships)
9. [Key Workflows](#9-key-workflows)
10. [API Endpoints](#10-api-endpoints)
11. [Frontend Pages & Routing](#11-frontend-pages--routing)
12. [Security Measures](#12-security-measures)
13. [Deployment](#13-deployment)
14. [Testing Strategy](#14-testing-strategy)
15. [Challenges & Solutions](#15-challenges--solutions)
16. [Future Scope](#16-future-scope)
17. [Conclusion](#17-conclusion)

---

## 1. Executive Summary

**Carenium** is a multi-role healthcare workforce management platform that streamlines the end-to-end lifecycle of nurse onboarding, hospital assignment, and duty management. The platform connects **nurses**, **hospital administrators**, **department heads**, and **platform administrators** under a single authentication system with role-scoped access control.

The system features a pipeline-driven nurse journey from registration through document verification, KYC processing, interview scheduling, CARE ID generation, and active duty management. Hospital-level data isolation ensures that each hospital admin sees only their own nurses, tasks, and department heads.

**Key Highlights:**
- 4 user roles with granular access control
- Pipeline-based nurse onboarding (6 stages)
- Hospital-scoped data isolation
- 63+ API endpoints
- 11 database tables
- 16 frontend pages
- SHA256 CARE ID verification system
- PDF/DOCX duty schedule export

---

## 2. Problem Statement

Healthcare facilities face several critical challenges in nurse workforce management:

| Challenge | Impact |
|-----------|--------|
| Manual nurse recruitment and onboarding | No centralized system for tracking pipeline stages |
| Document verification and KYC management | Scattered paperwork, no expiry tracking |
| Interview scheduling at scale | No batch processing or venue management |
| Cross-hospital data visibility | Hospital A's admin could see Hospital B's nurses |
| Task assignment without specialization matching | Mismatched nurse-to-task assignments |
| Lack of nurse self-service portal | Nurses have no visibility into their own pipeline status |

---

## 3. Solution Overview

A role-based web platform with a **pipeline-driven nurse onboarding flow**:

```
Registration → Document Upload → KYC Verification → 
Interview Scheduling → Interview Result → CARE ID Generation → 
Shift Unlock → Active Duty
```

Each stage gates access to the next, ensuring nurses complete all prerequisites before gaining full platform access.

---

## 4. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| Vite | 7.3.1 | Build tool and dev server |
| react-router-dom | 7.13.1 | Client-side routing |
| react-hook-form | 7.71.2 | Form validation |
| react-hot-toast | 2.6.0 | Toast notifications |
| axios | 1.13.6 | HTTP client |
| ESLint | 9.39.1 | Code linting |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11.8 | Runtime |
| FastAPI | 0.104.1 | Web framework |
| Uvicorn | 0.24.0 | ASGI server |
| SQLAlchemy | 2.0.23 | ORM |
| Pydantic | 2.5.0 | Data validation |
| python-jose | 3.3.0 | JWT token handling |
| bcrypt | 5.0.0 | Password hashing |
| slowapi | 0.1.9 | Rate limiting |
| Jinja2 | 3.1.2 | Email templates |
| ReportLab | - | PDF generation |
| python-docx | - | DOCX generation |

### Database

| Component | Technology |
|-----------|------------|
| Production | PostgreSQL (Supabase Cloud) |
| Local Dev | SQLite |
| UUID Support | Custom TypeDecorator (cross-dialect) |

### External Services

| Service | Purpose |
|---------|---------|
| Supabase Storage | Private document storage (nurse_documents bucket) |
| Resend | Email delivery service |
| Netlify | Frontend hosting |
| Render | Backend hosting |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React SPA (Netlify)                    │   │
│  │  Login │ Register │ Dashboard │ Admin │ Hospital   │   │
│  └───────────────────┬─────────────────────────────────┘   │
└──────────────────────┼─────────────────────────────────────┘
                       │ HTTPS / REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Render)                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Auth    │ │ Admin    │ │ Hospital │ │ Dept Head     │  │
│  │ Router  │ │ Router   │ │ Admin    │ │ Router        │  │
│  │         │ │          │ │ Router   │ │               │  │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Nurse   │ │ Document │ │ Export   │ │ Notification  │  │
│  │ Router  │ │ Router   │ │ Router   │ │ Router        │  │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Service Layer                            │   │
│  │  Email Service │ Notification Helper │ Validators  │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────┬─────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│  PostgreSQL  │ │  Resend  │ │ Supabase Storage │
│  (Supabase)  │ │  Email   │ │ (Documents)      │
└──────────────┘ └──────────┘ └──────────────────┘
```

### Authentication Flow

```
Login → JWT Token (60-min expiry)
         ├── nurse: { id, email, role, shift_unlocked, care_id_verified }
         ├── platform_admin: { id, email, role, admin_role }
         ├── hospital_admin: { id, email, role, admin_role, hospital_id, hospital_name }
         └── dept_head: { id, email, role, admin_role, hospital_id, hospital_name, department }
```

---

## 6. User Roles & Features

### Role Hierarchy

```
Platform Admin (super_admin)
    └── Hospital Admin (hospital_admin)
            └── Dept Head (dept_head)
                    └── Nurse
```

### 6.1 Nurse Features

**Pipeline-Based Dashboard** — The dashboard adapts based on the nurse's current stage:

| Stage | What Nurse Sees | Available Actions |
|-------|-----------------|-------------------|
| 1. Registered (KYC Pending) | Upload documents, status | Upload docs (5 types) |
| 2. KYC Approved | Awaiting interview | View status |
| 3. Interview Passed | CARE ID entry screen | Enter CARE ID |
| 4. Full Access | Dashboard, duty, ID card | All features |

**Features:**
- Registration with age validation (21+), specialization selection
- Document upload (5 types: Nursing Degree, National ID, Registration Certificate, Experience Letter, Nursing License)
- License expiry tracking with auto-renewal notification
- CARE ID entry with 3-attempt lockout and 24-hour cooldown
- Duty schedule view with task acknowledgment
- PDF and DOCX export of duty schedule
- 3D flip nurse ID card
- OTP-based password change
- In-app notification panel
- Profile settings

### 6.2 Platform Admin Features

| Module | Features |
|--------|----------|
| **Dashboard** | Stats: total nurses, KYC stages, interviews today, active nurses |
| **Nurse Registry** | List/search nurses, view documents via signed URLs, KYC verify/reject, request re-uploads, CSV export |
| **Interviews** | Create sessions (venue/hospital dropdown), batch assign nurses, upload results CSV, calendar view |
| **System ID Generation** | View PASSED/FAILED candidates, send CARE IDs (single + bulk), reset lockouts |
| **Hospital Admin Mgmt** | Create accounts, activate/deactivate with reason |
| **Position Management** | Assign positions to passed nurses, update |
| **Hospital Management** | CRUD hospitals |
| **Audit Logs** | View all admin actions |
| **Venue Master** | Upload venue CSV for interview dropdown |

### 6.3 Hospital Admin Features

| Module | Features |
|--------|----------|
| **Dashboard** | Hospital-scoped stats: active nurses, tasks (total/today), department breakdown (5 departments) |
| **Nurses** | View only their hospital's nurses, filter by specialization |
| **Task History** | View tasks scoped to their hospital |
| **Dept Head Mgmt** | Create dept head accounts, list dept heads (scoped to hospital) |
| **Task Assignment** | Assign tasks to nurses (specialization match enforced) |

### 6.4 Department Head Features

| Module | Features |
|--------|----------|
| **Dashboard** | Department-scoped stats: nurse count, tasks (total/pending/acknowledged/today) |
| **My Nurses** | View nurses in their department only |
| **Task History** | View tasks scoped to their department + hospital |
| **Task Assignment** | Assign tasks with hard specialization enforcement |

---

## 7. Database Design

### 7.1 Entity Relationship Diagram

```
User (admin) ────[has]────> Hospital
User (admin) ──[creates]──> AuditLog
User (admin) ──[creates]──> InterviewSession
InterviewSession ─[at]────> Hospital (optional)

Nurse ──[has]────> NurseDocument (1-to-many)
Nurse ──[has]────> Interview (1-to-many)
Nurse ──[has]────> Position (1-to-1, optional)
Nurse ──[belongs]─> Hospital (many-to-1)
Nurse ──[has]────> ShiftAssignment (1-to-many)
Nurse ──[has]────> Notification (1-to-many)

Position ──[at]──> Hospital
ShiftAssignment ─[at]──> Hospital
InterviewSession ─[at]──> Hospital (optional)
```

### 7.2 Table Definitions

#### users — Admin Accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| email | String | UNIQUE, NOT NULL, INDEX | Login email |
| password | String | NOT NULL | bcrypt hashed |
| role | String | NOT NULL | Always "admin" |
| admin_role | String | default "platform_admin" | "platform_admin", "hospital_admin", "dept_head" |
| hospital_id | UUID | FK → hospitals.id, NULLABLE | Hospital scope |
| hospital_name | String | NULLABLE | Denormalised for speed |
| department | String | NULLABLE | Dept head department |
| full_name | String | NULLABLE | Display name |
| is_active | Boolean | default TRUE | Admin activation status |
| must_reset_password | Boolean | default FALSE | Force password reset |
| deactivation_reason | String | NULLABLE | Reason for deactivation |

#### nurses — Core Nurse Data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| full_name | String | NOT NULL | Nurse full name |
| email | String | UNIQUE, NOT NULL, INDEX | Login and contact email |
| phone | String | NOT NULL | Contact phone number |
| age | Integer | NOT NULL | Must be 21+ |
| registration_number | String | UNIQUE, NOT NULL | Nursing council registration |
| specialization | String | NULLABLE | ICU, Home Care, Pediatrics, etc. |
| password | String | NOT NULL | bcrypt hashed |
| is_verified | Boolean | default FALSE | KYC approval status |
| is_active | Boolean | default FALSE | Account active status |
| interview_status | String | default "PENDING" | PENDING, SCHEDULED, PASSED, FAILED, SELECTED, REJECTED |
| position_id | UUID | FK → positions.id, NULLABLE | Assigned position |
| rejection_reason | Text | NULLABLE | KYC rejection reason |
| location_preference | String | NULLABLE | Preferred work location |
| experience_years | Integer | NULLABLE | Years of nursing experience |
| hospital_id | UUID | FK → hospitals.id, NULLABLE | Assigned hospital |
| shift_unlocked | Boolean | default FALSE | CARE ID verified |
| unlock_key_hash | String | NULLABLE | SHA256 of CARE ID |
| care_id | String | NULLABLE | Format: CARE-20YY-XXXX |
| care_id_verified | Boolean | default FALSE | Correct CARE ID entry |
| care_id_email_sent | Boolean | default FALSE | Email dispatched flag |
| care_id_attempts | Integer | default 0 | Failed attempt counter |
| care_id_locked_until | DateTime | NULLABLE | Lockout expiry |
| created_at | DateTime | server_default=now() | Record creation timestamp |

#### nurse_documents — Uploaded Documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| nurse_id | UUID | FK → nurses.id, NOT NULL | Document owner |
| document_type | String | NOT NULL | Nursing Degree, National ID, etc. |
| file_path | String | NOT NULL | Supabase storage path |
| is_verified | Boolean | default FALSE | Admin verification flag |
| reupload_requested | Boolean | default FALSE | Admin flagged for re-upload |
| reupload_reason | String | NULLABLE | Reason shown to nurse |
| expiry_date | Date | NULLABLE | License expiry tracking |
| uploaded_at | DateTime | server_default=now() | Upload timestamp |

#### interviews — Interview Records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| nurse_id | UUID | FK → nurses.id, NOT NULL | Interviewee |
| interviewer_name | String | NOT NULL | Who conducted |
| interview_date | DateTime | NOT NULL | Scheduled date/time |
| location | String | NOT NULL | Venue name |
| status | String | default "SCHEDULED" | SCHEDULED, COMPLETED, CANCELLED |
| result | String | NULLABLE | PASSED, FAILED, ON_HOLD |
| notes | Text | NULLABLE | Interview notes |
| created_at | DateTime | server_default=now() | Creation timestamp |
| updated_at | DateTime | auto-update | Last modified |

#### hospitals — Hospital Master

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| name | String | NOT NULL | Hospital name |
| location | String | NOT NULL | Physical address |
| city | String | NOT NULL | City |
| state | String | NOT NULL | State |
| departments | String | NULLABLE | Comma-separated list |
| contact_email | String | NULLABLE | Contact email |
| contact_phone | String | NULLABLE | Contact phone |
| created_at | DateTime | server_default=now() | Creation timestamp |

#### positions — Position Assignment

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| nurse_id | UUID | FK → nurses.id, NOT NULL | Assigned nurse |
| hospital_id | UUID | FK → hospitals.id, NOT NULL | Workplace hospital |
| position_type | String | NOT NULL | Home Nurse, Hospital Staff, ICU Nurse, etc. |
| salary | Numeric(10,2) | NOT NULL | Compensation |
| shift | String | NOT NULL | Morning, Evening, Night, Rotational |
| start_date | DateTime | NOT NULL | Employment start |
| end_date | DateTime | NULLABLE | Employment end |
| status | String | default "ACTIVE" | ACTIVE, COMPLETED, TERMINATED |
| created_at | DateTime | server_default=now() | Creation timestamp |

#### shift_assignments — Duty/Task Records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| nurse_id | UUID | FK → nurses.id, NOT NULL | Task assignee |
| shift_date | Date | NOT NULL | Duty date |
| shift_time | String | NOT NULL | Time slot |
| location | String | NOT NULL | General location |
| task_notes | Text | NULLABLE | Instructions |
| task_title | String | NULLABLE | e.g., "Emergency Triage Monitoring" |
| task_type | String | NULLABLE | e.g., "Emergency Response" |
| priority | String | default "routine" | emergency, urgent, routine |
| ward | String | NULLABLE | "Emergency Ward, Block A" |
| floor_location | String | NULLABLE | "Ground Floor" |
| task_status | String | default "assigned" | assigned, acknowledged, completed |
| specialization_required | String | NULLABLE | Required specialization |
| assigned_by | String | NULLABLE | Admin's email |
| hospital_id | UUID | FK → hospitals.id, NULLABLE | Hospital scope |
| created_at | DateTime | server_default=now() | Creation timestamp |
| updated_at | DateTime | auto-update | Last modified |

#### audit_logs — Admin Action Trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| admin_id | UUID | FK → users.id, NOT NULL | Who performed action |
| action_type | String | NOT NULL | KYC_APPROVED, KYC_REJECTED, etc. |
| nurse_id | UUID | FK → nurses.id, NULLABLE | Target nurse |
| previous_status | String | NULLABLE | State before action |
| new_status | String | NULLABLE | State after action |
| details | Text | NULLABLE | Additional context |
| timestamp | DateTime | server_default=now() | Action timestamp |

#### notifications — In-App Alerts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| nurse_id | UUID | FK → nurses.id, NOT NULL | Recipient nurse |
| title | String(200) | NOT NULL | Notification title |
| message | Text | NOT NULL | Notification body |
| notification_type | String(50) | NOT NULL | kyc_approved, kyc_rejected, etc. |
| is_read | Boolean | default FALSE | Read status |
| created_at | DateTime | server_default=now() | Creation timestamp |

#### interview_sessions — Batch Interview Scheduling

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| venue_name | String | NOT NULL | Venue or hospital name |
| venue_address | String | NULLABLE | Full address |
| interview_date | Date | NOT NULL | Session date |
| interview_time | String | NOT NULL | "10:00 AM" format |
| instructions | Text | NULLABLE | Session instructions |
| hospital_id | UUID | FK → hospitals.id, NULLABLE | If venue is a hospital |
| created_by | UUID | FK → users.id, NULLABLE | Admin creator |
| created_at | DateTime | server_default=now() | Creation timestamp |

#### venue_master — Venue CSV Import

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Unique identifier |
| venue_name | String | NOT NULL | Venue name |
| room_number | String | NULLABLE | Room number |
| floor | String | NULLABLE | Floor level |
| block | String | NULLABLE | Building block |
| branch | String | NULLABLE | Branch location |
| uploaded_at | DateTime | server_default=now() | Upload timestamp |

---

## 8. Entity Relationships

### 8.1 Direct Foreign Key Relationships

```
hospitals (id)
  ├── users.hospital_id          (hospital_id matches hospitals.id)
  ├── nurses.hospital_id         (nurse's assigned hospital)
  ├── positions.hospital_id      (position's workplace hospital)
  ├── shift_assignments.hospital_id (task's hospital scope)
  └── interview_sessions.hospital_id (session's hospital link)

nurses (id)
  ├── nurse_documents.nurse_id   (1 nurse → many documents)
  ├── interviews.nurse_id        (1 nurse → many interviews)
  ├── notifications.nurse_id     (1 nurse → many notifications)
  ├── shift_assignments.nurse_id (1 nurse → many tasks)
  └── positions.nurse_id         (1 nurse → 1 position, optional)

users (id)
  ├── audit_logs.admin_id        (1 admin → many audit logs)
  └── interview_sessions.created_by (1 admin → many sessions)
```

### 8.2 Scope Chain

```
Platform Admin
  └── sees ALL data (global)

Hospital Admin ─── hospital_id ──→ Hospital
  ├── nurses:       WHERE hospital_id = admin's hospital
  ├── tasks:        WHERE ShiftAssignment.hospital_id = admin's hospital
  └── dept heads:   WHERE User.hospital_id = admin's hospital

Dept Head ─── hospital_id + department ──→ Hospital + Department
  ├── nurses:       WHERE hospital_id + specialization = dept
  └── tasks:        WHERE hospital_id + specialization_required = dept
```

---

## 9. Key Workflows

### 9.1 Nurse Onboarding Pipeline

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│REGISTER  │────▶│UPLOAD    │────▶│KYC       │────▶│INTERVIEW │────▶│CARE ID   │────▶│FULL      │
│          │     │DOCUMENTS │     │REVIEW    │     │          │     │ENTRY     │     │ACCESS    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │                │                │
     ▼                ▼                ▼                ▼                ▼                ▼
  Create        Upload 5       Admin waits      Admin         Nurse enters     View duty
  account +     doc types:     docs via         schedules     CARE ID (3       schedule,
  receive       Degree, ID,    signed URLs,     interview,    attempts,        acknowledge
  welcome       Registration,  approves or      records       SHA256 hash      tasks, export
  email         Experience,    rejects          result        verification)    PDF/DOCX
                License                                       24hr lockout
```

**Stage Details:**

1. **Registration** (`POST /nurses/register`)
   - Nurse submits: full_name, email, phone, age (21+), registration_number, specialization, password
   - System sends welcome email via Resend
   - Initial state: `is_verified=false`, `is_active=false`, `interview_status="PENDING"`

2. **Document Upload** (`POST /documents/upload`)
   - 5 document types required
   - License document tracked with `expiry_date`
   - Files stored in Supabase Storage private bucket at path `{nurse_id}/{uuid}.{ext}`
   - Re-upload allowed when admin flags document

3. **KYC Review** (`POST /admin/nurses/{id}/verify` or `/reject`)
   - Admin views documents via signed URLs (1-hour expiry, no public exposure)
   - Verify → `is_verified=true`, `is_active=true`, email sent with notification
   - Reject → `rejection_reason` set, email sent with reason
   - Re-upload request → `reupload_requested=true`, nurse notified

4. **Interview Scheduling**
   - Admin creates `InterviewSession` (venue from hospital list or VenueMaster CSV)
   - Admin batch-assigns verified nurses to session
   - Each nurse gets an `Interview` record with status `SCHEDULED`
   - Nurse receives email + in-app notification

5. **Interview Result** (`POST /admin/interviews/{nurse_id}/result`)
   - **Selected:** CARE ID generated (`CARE-20YY-XXXX`), SHA256 hash stored, `hospital_id` set from session venue
   - **Not Selected:** Status set to `REJECTED`, rejection email sent
   - Notification sent in both cases

6. **CARE ID Entry** (`POST /nurses/unlock`)
   - SHA256 hash comparison (backend never stores plain text key)
   - 3 attempts allowed, 24-hour lockout on failure
   - Success: `shift_unlocked=true`, `care_id_verified=true`

7. **Active Duty**
   - View schedule (`GET /nurses/shift-info`)
   - Acknowledge tasks (`PUT /nurses/tasks/{id}/acknowledge`)
   - Export duty schedule as PDF or DOCX
   - Access 3D flip ID card on dashboard

### 9.2 Hospital Admin Management Flow

```
Platform Admin creates Hospital Admin account
  ├── email, full_name, hospital_name
  ├── 15-char random password auto-generated
  └── is_active = false (pending activation)

Platform Admin activates Hospital Admin
  ├── POST /admin/hospital-admins/{id}/toggle-active
  ├── is_active = true
  └── must_reset_password = true

Hospital Admin logs in → forced password reset → dashboard

Hospital Admin creates Dept Head accounts
  ├── email, full_name, department
  ├── Hospital ID inherited from creator
  └── 15-char random password auto-generated
```

### 9.3 Task Assignment Flow

```
Admin identifies active nurse (care_id_verified = true)

Admin creates task with:
  ├── shift_date (future date enforced)
  ├── shift_time
  ├── ward, floor
  ├── task_title, task_type
  ├── priority (emergency/urgent/routine)
  └── specialization_required

Backend validates:
  ├── Nurse exists and is active
  ├── Specialization matches (hard enforcement)
  └── Date is not in the past

Task created (status = "assigned")
  ├── hospital_id set from admin's hospital
  └── In-app notification sent to nurse

Nurse views task → acknowledges (status = "acknowledged")
```

### 9.4 Interview Session Creation Flow

```
Platform Admin uploads Venue Master CSV (optional)
  └── Parsed into VenueMaster table

Platform Admin creates Interview Session
  ├── Select venue from dropdown:
  │     ├── 🏥 Hospital names (from hospitals table)
  │     └── Venue names (from VenueMaster CSV)
  ├── Venue address auto-fills
  ├── Date, time, instructions
  └── If hospital selected → hospital_id stored on session

Admin batch-assigns verified nurses
  ├── Individual Interview records created
  ├── Nurse status → SCHEDULED
  └── Email + notification sent

Admin records results (single or CSV upload)
  ├── Selected → CARE ID generated + hospital linked
  └── Not selected → rejection email
```

---

## 10. API Endpoints

### 10.1 Auth (`/auth`) — 4 endpoints

| Method | Path | Description | Rate Limited |
|--------|------|-------------|:---:|
| POST | `/auth/login` | Universal login (nurse + admin) | Yes |
| POST | `/auth/reset-password` | First-login password reset | No |
| POST | `/auth/send-otp` | Send 6-digit OTP to email | Yes |
| POST | `/auth/change-password` | Change password with OTP verification | No |

### 10.2 Nurse (`/nurses`) — 5 endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/nurses/register` | Nurse registration |
| GET | `/nurses/me` | Profile with lockout info |
| POST | `/nurses/unlock` | CARE ID entry |
| GET | `/nurses/shift-info` | ID card + shift assignments |
| PUT | `/nurses/tasks/{task_id}/acknowledge` | Acknowledge task |

### 10.3 Documents (`/documents`) — 2 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/documents/my-documents` | List nurse's documents |
| POST | `/documents/upload` | Upload or re-upload document |

### 10.4 Notifications (`/notifications`) — 2 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications/my-notifications` | List nurse's notifications |
| PUT | `/notifications/{id}/read` | Mark notification as read |

### 10.5 Admin (`/admin`) — 30+ endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/nurses` | List all nurses |
| GET | `/admin/nurses/search` | Search by email/registration number |
| GET | `/admin/nurses/{id}/documents` | Get nurse's documents |
| GET | `/admin/nurses/{id}/documents/{docId}/view` | Generate signed URL |
| POST | `/admin/nurses/{id}/verify` | KYC approval |
| POST | `/admin/nurses/{id}/reject` | KYC rejection |
| POST | `/admin/nurses/{id}/request-reupload` | Request document re-upload |
| POST | `/admin/interviews` | Schedule individual interview |
| GET | `/admin/interviews` | List all interviews |
| GET | `/admin/interviews/calendar` | Calendar view |
| PUT | `/admin/interviews/{id}/result` | Mark interview result |
| POST | `/admin/interviews/{nurse_id}/result` | Submit result + generate CARE ID |
| GET | `/admin/nurses/eligible` | Nurses eligible for positions |
| POST | `/admin/positions` | Assign position to nurse |
| GET | `/admin/positions` | List all positions |
| PUT | `/admin/positions/{id}` | Update position |
| POST | `/admin/hospitals` | Add hospital |
| GET | `/admin/hospitals` | List hospitals |
| PUT | `/admin/hospitals/{id}` | Update hospital |
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/admin/audit-logs` | Audit log viewer |
| POST | `/admin/interviews/sessions` | Create interview session |
| GET | `/admin/interviews/sessions` | List interview sessions |
| POST | `/admin/interviews/assign` | Batch assign nurses to session |
| POST | `/admin/interviews/upload-results` | Upload results CSV |
| POST | `/admin/venues/upload` | Upload venue master CSV |
| GET | `/admin/venues` | Get venues + hospitals (merged dropdown) |
| POST | `/admin/care-id/send/{nurse_id}` | Send CARE ID email |
| POST | `/admin/care-id/send-bulk` | Bulk send CARE ID emails |
| POST | `/admin/care-id/reset-lockout/{nurse_id}` | Reset CARE ID lockout |
| GET | `/admin/system-id/candidates` | Candidates for CARE ID |
| GET | `/admin/nurses/active` | Active nurses (for task assignment) |
| POST | `/admin/tasks/assign` | Assign task |
| GET | `/admin/tasks` | List all tasks |
| POST | `/admin/hospital-admins/create` | Create hospital admin |
| GET | `/admin/hospital-admins` | List hospital admins |
| POST | `/admin/hospital-admins/{id}/toggle-active` | Activate/deactivate |
| GET | `/admin/nurses/export` | Export nurses CSV |
| POST | `/admin/nurses/{id}/shifts` | Create shift |
| GET | `/admin/nurses/{id}/shifts` | Get nurse shifts |

### 10.6 Hospital Admin (`/hospital-admin`) — 5 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hospital-admin/stats` | Hospital-scoped dashboard stats |
| GET | `/hospital-admin/nurses` | Nurses scoped to hospital |
| GET | `/hospital-admin/tasks` | Tasks scoped to hospital |
| POST | `/hospital-admin/dept-heads/create` | Create department head |
| GET | `/hospital-admin/dept-heads` | List department heads (scoped) |

### 10.7 Dept Head (`/dept`) — 4 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dept/stats` | Department-scoped stats |
| GET | `/dept/nurses` | Nurses in department |
| POST | `/dept/tasks/assign` | Assign task to nurse |
| GET | `/dept/tasks` | Tasks in department |

### 10.8 Export (`/nurses/export`) — 1 endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/nurses/export/tasks?format=pdf\|docx` | Export duty schedule |

### 10.9 Health — 2 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server uptime status |
| HEAD | `/health` | Lightweight health check |

---

## 11. Frontend Pages & Routing

| Page Component | Route(s) | Role | Purpose |
|----------------|----------|------|---------|
| Login.jsx | `/login` | Public | Authentication |
| Register.jsx | `/register` | Public | Nurse registration |
| NurseDashboard.jsx | `/dashboard` | Nurse | Pipeline-based dashboard |
| Documents.jsx | `/documents` | Nurse | Document upload/re-upload |
| WorkingShift.jsx | `/working-shift` | Nurse | CARE ID entry |
| DutyPage.jsx | `/duty` | Nurse | Duty schedule & task acknowledgment |
| Requests.jsx | `/requests` | Nurse | Delivery requests (future) |
| ProfileSettings.jsx | `/profile` | All | Password change |
| SetNewPassword.jsx | `/set-password` | All | First-login password reset |
| AdminDashboard.jsx | `/admin` | Platform Admin | Platform overview |
| NurseRegistry.jsx | `/admin/nurses` | Platform Admin | KYC management |
| Interviews.jsx | `/admin/interviews` | Platform Admin | Interview sessions & results |
| SystemIDGeneration.jsx | `/admin/system-id` | Platform Admin | CARE ID management |
| HospitalAdminManagement.jsx | `/admin/hospital-admins` | Platform Admin | Hospital admin accounts |
| HospitalAdminDashboard.jsx | `/hospital-admin/*` | Hospital Admin | Hospital dashboard |
| DeptHeadDashboard.jsx | `/dept/*` | Dept Head | Department dashboard |

### Shared Components

| Component | Purpose |
|-----------|---------|
| AppLayout.jsx | Role-based sidebar, notification bell, responsive grid |
| NurseIDCard.jsx | 3D flip nurse identification card |

---

## 12. Security Measures

### Authentication & Authorization

| Measure | Implementation |
|---------|---------------|
| JWT Tokens | HMAC-SHA256 via python-jose, 60-minute expiry |
| Password Hashing | bcrypt with salt rounds |
| Rate Limiting | slowapi on login and OTP endpoints |
| Role Enforcement | Dependency injection `get_current_admin_user()` on every protected endpoint |
| Hospital Scoping | JWT contains `hospital_id` — used in every hospital-scoped query |

### Data Protection

| Measure | Implementation |
|---------|---------------|
| CARE ID Storage | SHA256 hash stored, plain text never persisted |
| Document Access | Signed URLs with 1-hour expiry, no public bucket access |
| Input Sanitization | Pydantic validators strip HTML/XSS from admin inputs |
| CORS | Configured for frontend domain only |

### Access Control Matrix

```
                    List Nurses   View Tasks   Create Tasks   Manage Dept Heads
Platform Admin         ALL          ALL           ALL              ALL
Hospital Admin        THEIR        THEIR         THEIR            THEIR
Dept Head             THEIR        THEIR         THEIR            N/A
Nurse                 OWN          OWN           N/A              N/A
```

---

## 13. Deployment

### Architecture

```
┌─────────────────────────────┐
│  Netlify (Frontend)         │
│  ┌───────────────────────┐  │
│  │  Vite Build           │  │
│  │  SPA Redirect (/* → ) │  │
│  └───────────────────────┘  │
└────────────┬────────────────┘
             │ HTTPS
             ▼
┌─────────────────────────────┐
│  Render (Backend)           │
│  ┌───────────────────────┐  │
│  │  Uvicorn + FastAPI    │  │
│  │  Environment Config   │  │
│  └───────────────────────┘  │
└────────────┬────────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
 Supabase  Resend   Supabase
    DB      Email   Storage
```

### URLs

| Component | URL |
|-----------|-----|
| Frontend | `https://marvelous-dango-21acdf.netlify.app` |
| Backend | `https://nurse-wvfe.onrender.com` |
| Database | Internal (Supabase PostgreSQL — not public) |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | PostgreSQL connection string |
| SECRET_KEY | JWT signing key |
| RESEND_API_KEY | Email service API key |
| MAIL_FROM | Sender email address |
| MAIL_FROM_NAME | Sender display name |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_KEY | Supabase service key |
| BACKEND_URL | Public backend URL |

### CI/CD

- **Frontend:** Netlify auto-deploys on push to `master` branch
- **Backend:** Render auto-deploys on push to `master` branch
- **Database:** Schema changes via SQLAlchemy migrations or direct SQL

---

## 14. Testing Strategy

### Backend Testing

| Layer | Approach |
|-------|----------|
| API Endpoints | Manual testing via Swagger UI at `/docs` |
| Data Validation | Pydantic schema validation on all inputs |
| Access Control | Test each endpoint with different role tokens |
| Email Flow | Resend test mode with `onboarding@resend.dev` |

### Test Scripts

| Script | Purpose |
|--------|---------|
| `backend/test_email.py` | Verify email delivery via Resend |
| `backend/seed_demo.py` | Seed demo data for manual testing |
| `backend/cleanup_nurses.py` | Remove test nurse records |

### Validation Rules

| Field | Rule |
|-------|------|
| Nurse Age | Minimum 21 years |
| Password | Minimum 8 characters |
| Interview Date | Cannot be in the past |
| Task Date | Cannot be in the past |
| CARE ID Attempts | Maximum 3, then 24-hour lockout |
| Document Types | Exactly 5 pre-defined types |
| Specialization | Must match exactly on task assignment |

---

## 15. Challenges & Solutions

### Challenge 1: Cross-Hospital Data Visibility

**Problem:** All hospital admins could see all nurses and tasks globally, violating data isolation requirements.

**Solution:** Added `hospital_id` column to the `nurses`, `shift_assignments`, and `interview_sessions` tables. Implemented hospital-scoped filtering on all hospital admin and dept head endpoints. Backfilled existing data to establish proper relationships.

### Challenge 2: Nurse-Hospital Association at Scale

**Problem:** No natural point in the onboarding flow to associate a nurse with a hospital.

**Solution:** Leveraged the interview session creation flow — when an admin selects a hospital from the venue dropdown, the `hospital_id` is stored on the session. When a nurse passes their interview at that session, the system automatically copies the `hospital_id` to the nurse's record.

### Challenge 3: Secure CARE ID Distribution

**Problem:** CARE IDs needed to be delivered to nurses securely without exposing them in the database.

**Solution:** Stored only SHA256 hash of the CARE ID in the database. The plain text ID is delivered via email only and verified by hashing the nurse's entry and comparing with the stored hash.

### Challenge 4: Document Privacy

**Problem:** Nurse documents (IDs, certificates) must never be publicly accessible.

**Solution:** Used Supabase private storage bucket + signed URLs with 1-hour expiry. Documents are never served directly — only temporary signed URLs generated on-demand for admin review.

### Challenge 5: Multi-Tenant Data Isolation

**Problem:** Platform admin needs full visibility while hospital admins need restricted visibility.

**Solution:** Implemented JWT-based role scoping with `admin_role` and `hospital_id` embedded in the token. Every query conditionally applies filters based on the token's contents.

---

## 16. Future Scope

### Short Term (Next 3 Months)

| Feature | Description | Priority |
|---------|-------------|:--------:|
| Patient Booking System | Allow care recipients to browse and book nurses by specialization | High |
| Real-time Notifications | WebSocket integration for instant task alerts | High |
| Mobile App | React Native app for nurse mobile access | Medium |

### Medium Term (3-6 Months)

| Feature | Description |
|---------|-------------|
| Analytics Dashboard | Advanced reporting on nurse performance and hospital metrics |
| Payroll Integration | Automated salary processing based on completed tasks |
| Shift Swap | Allow nurses to swap shifts with peer approval |
| Multi-language Support | Regional language support for nurses |

### Long Term (6-12 Months)

| Feature | Description |
|---------|-------------|
| AI-Based Nurse Matching | Suggest optimal nurse-task assignments based on skills and location |
| Compliance Dashboard | Automated license expiry monitoring and renewal reminders |
| Marketplace Model | Allow nurses to browse and pick shifts across multiple hospitals |
| Integration with Hospital EMR | Connect with existing hospital electronic medical record systems |

---

## 17. Conclusion

Carenium Nurse Portal successfully solves the critical problem of nurse workforce management in a multi-hospital ecosystem. The platform delivers:

- **A complete nurse lifecycle** from registration to active duty management
- **Role-based access control** with hospital-level data isolation
- **Secure document management** with private storage and temporary access
- **Efficient interview management** with batch scheduling and venue integration
- **Task assignment** with specialization matching enforcement
- **Scalable architecture** using modern technologies (React, FastAPI, PostgreSQL)

The pipeline-driven approach ensures that every nurse completes all required stages before gaining full platform access, while the multi-role hierarchy enables platform administrators, hospital administrators, and department heads to operate within their respective scopes.

With the foundation in place, the platform is well-positioned for future enhancements including patient booking, real-time notifications, mobile access, and AI-powered nurse matching.
