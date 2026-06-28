# PRD: Multi-Role Healthcare Platform (Nurse Portal)

## 1. Overview

A common admin platform connecting nurses, doctors, hospital admins, and department heads under one authentication system. Each role has a dedicated portal routed after login via JWT role claims.

## 2. User Roles & Access

| Role | Portal | Route |
|------|--------|-------|
| **Nurse** | Nurse Dashboard | `/dashboard` |
| **Platform Admin** | Admin Portal | `/admin` |
| **Hospital Admin** | Hospital Admin | `/hospital-admin` |
| **Dept Head** | Dept Dashboard | `/dept` |
| **Doctor** *(future)* | Doctor Portal | `/doctor` |

**Auth:** One login endpoint (`POST /auth/login`), JWT with `role` + role-specific claims. Frontend routes via `RootRedirect` based on decoded token.

## 3. Nurse Pipeline (Core Workflow)

```
Register → Upload Docs → KYC Review → Interview → CARE ID → Full Access
```

| Stage | Fields Updated | Description |
|-------|---------------|-------------|
| **1. Registered** | `is_active=false`, `is_verified=false` | Nurse signs up with name, email, phone, age (min 21), registration/license number, specialization, password |
| **2. Docs Upload** | — | 5 document types: Nursing Degree, National ID, Registration Cert, Experience Letter, Nursing License (with expiry) |
| **3. KYC Review** | `is_verified=true/false` | Admin approves/rejects/requests re-upload |
| **4. Interview** | `interview_status=SCHEDULED→SELECTED/REJECTED` | Admin schedules + marks result. On SELECTED → CARE ID generated |
| **5. CARE ID Entry** | `care_id_verified=true` | Nurse enters CARE ID (3 attempts, 24hr lockout). Unlocks full access |
| **6. Active** | `shift_unlocked=true` | Full dashboard: shift schedule, duty tasks, ID card, exports |

## 4. Nurse Data Model

**Table: `nurses`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `full_name` | String | Required |
| `email` | String | Unique, login credential |
| `phone` | String | Required |
| `age` | Integer | Min 21 |
| `registration_number` | String | Unique, license number |
| `specialization` | String | ICU, Home Care, Pediatrics, General, Emergency, Oncology |
| `password` | String | bcrypt hashed |
| `is_verified` | Boolean | KYC document status |
| `is_active` | Boolean | Account active flag |
| `interview_status` | String | PENDING → SCHEDULED → SELECTED/REJECTED |
| `shift_unlocked` | Boolean | Full access granted |
| `care_id` | String | Format: CARE-YYYY-XXXX |
| `care_id_verified` | Boolean | After correct entry |
| `care_id_attempts` | Integer | Max 3 before 24hr lockout |

**Related tables:** `nurse_documents`, `interviews`, `shift_assignments`, `notifications`, `positions`

## 5. API Endpoints

### Public
- `POST /auth/login` — Login (nurses + admins)
- `POST /nurses/register` — Nurse registration

### Nurse (JWT required)
- `GET /nurses/me` — Profile
- `POST /nurses/unlock` — CARE ID entry
- `GET /nurses/shift-info` — ID card + shifts
- `PUT /nurses/tasks/{id}/acknowledge` — Acknowledge duty
- `GET /nurses/export/tasks?format=pdf|docx` — Export schedule
- `GET /documents/my-documents` — List docs
- `POST /documents/upload` — Upload doc (multipart)
- `POST /auth/send-otp` / `POST /auth/change-password` — Password change

### Admin (manages nurses)
- `GET /admin/nurses` — List
- `GET /admin/nurses/search` — Search by email/reg number
- `POST /admin/nurses/{id}/verify` — Approve KYC
- `POST /admin/nurses/{id}/reject` — Reject KYC
- `POST /admin/interviews/{id}/result` — Interview result (generates CARE ID on select)
- `POST /admin/care-id/send/{id}` — Send CARE ID email
- `POST /admin/tasks/assign` — Assign shift/duty
- `GET /admin/dashboard/stats` — Platform stats

## 6. Frontend Routes (Nurse)

| Route | Page |
|-------|------|
| `/dashboard` | Nurse Dashboard (4 views by stage) |
| `/documents` | Document upload/re-upload |
| `/working-shift` | CARE ID entry |
| `/duty` | Shift schedule + acknowledge |
| `/requests` | Delivery requests *(placeholder)* |
| `/profile` | Profile settings, change password |

Dashboard renders different views based on pipeline stage: KYC Pending → KYC Approved → Interview Passed → Full Access.

## 7. Key Design Decisions for Common Platform

- **Unified auth**: Single login, JWT with role routing
- **Role-based route guards**: `ProtectedRoute` component checks JWT role claims
- **Nurse pipeline as state machine**: Model fields drive dashboard views + admin filters
- **Document management**: Signed URLs (1hr expiry), re-upload workflow with expiry tracking
- **CARE ID system**: Auto-generated on interview pass, 3-strike lockout, email delivery
- **Notifications**: In-app + email for each stage transition
- **Audit trail**: All admin actions logged in `audit_logs` table
- **Admin hierarchy**: Platform Admin > Hospital Admin > Dept Head (scoped by hospital/dept)

## 8. Future: Doctor Role (Design Guide)

To add a Doctor role, follow the existing Nurse pattern:
1. Create `doctors` table with doctor-specific fields
2. Add `POST /auth/login` to recognize `role = "doctor"`
3. Create `routers/doctor.py` with endpoints
4. Add frontend pages under `/doctor` route
5. Extend `RootRedirect` + `ProtectedRoute` for the new role
6. Add doctor to admin management endpoints
