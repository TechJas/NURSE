import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

doc = Document()

# ── Styles ──
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

# ── Title Page ──
for _ in range(6):
    doc.add_paragraph()

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('Carenium Nurse Portal')
run.bold = True
run.font.size = Pt(28)
run.font.color.rgb = RGBColor(79, 70, 229)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('Project Report')
run.font.size = Pt(20)
run.font.color.rgb = RGBColor(107, 114, 128)

doc.add_paragraph()

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = meta.add_run('Healthcare Workforce Management Platform\n\n')
run.font.size = Pt(12)
run.font.color.rgb = RGBColor(107, 114, 128)

doc.add_page_break()

# ── Table of Contents ──
doc.add_heading('Table of Contents', level=1)
toc_items = [
    '1. Executive Summary',
    '2. Problem Statement',
    '3. Solution Overview',
    '4. Technology Stack',
    '5. User Roles & Features',
    '6. System Architecture',
    '7. Database Design',
    '8. Key Workflows',
    '9. API Endpoints',
    '10. Security Measures',
    '11. Deployment',
    '12. Future Scope',
    '13. Conclusion',
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.space_after = Pt(2)

doc.add_page_break()

# ── Helper ──
def add_table(doc, headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        hdr.cells[i].text = h
    for row_data in rows:
        row = table.add_row()
        for i, val in enumerate(row_data):
            row.cells[i].text = str(val)
    doc.add_paragraph()

# ══════════════════════════════════════════════
# 1. EXECUTIVE SUMMARY
# ══════════════════════════════════════════════
doc.add_heading('1. Executive Summary', level=1)

doc.add_paragraph(
    'Carenium is a multi-role healthcare workforce management platform that streamlines '
    'the end-to-end lifecycle of nurse onboarding, hospital assignment, and duty management. '
    'The platform connects nurses, hospital administrators, department heads, and platform '
    'administrators under a single authentication system with role-scoped access control.'
)
doc.add_paragraph(
    'Built with React and FastAPI, backed by PostgreSQL on Supabase, '
    'the platform handles the complete nurse journey from registration through KYC verification, '
    'interview scheduling, CARE ID generation, and active duty management. Each hospital operates '
    'in an isolated data environment, ensuring that staff, tasks, and department heads are visible '
    'only to their respective hospital administrators.'
)

# ══════════════════════════════════════════════
# 2. PROBLEM STATEMENT
# ══════════════════════════════════════════════
doc.add_heading('2. Problem Statement', level=1)

problems = [
    'Manual nurse recruitment and onboarding with no centralized digital system',
    'Document verification and KYC management spread across multiple hospitals without standardization',
    'Interview scheduling and batch processing at scale with no automation',
    'Task assignment without specialization matching leads to misallocation of nursing staff',
    'Cross-hospital visibility of nurses and tasks violates data isolation requirements',
    'No unified platform for nurses to track their career pipeline from registration to active duty',
    'Lack of centralized audit trail for compliance and governance',
]
for p in problems:
    doc.add_paragraph(p, style='List Bullet')

# ══════════════════════════════════════════════
# 3. SOLUTION OVERVIEW
# ══════════════════════════════════════════════
doc.add_heading('3. Solution Overview', level=1)

doc.add_paragraph(
    'Carenium provides a role-based web platform with a pipeline-driven nurse onboarding flow:'
)

# Pipeline diagram as table
add_table(doc, ['Stage', 'Description', 'State'],
    [
        ['1. Registration', 'Nurse creates account with personal and professional details', 'PENDING'],
        ['2. Document Upload', 'Upload 5 document types with expiry tracking', 'KYC_PENDING'],
        ['3. KYC Verification', 'Admin reviews documents via signed URLs', 'APPROVED/REJECTED'],
        ['4. Interview', 'Session at hospital venue, batch scheduling', 'SCHEDULED/PASSED'],
        ['5. CARE ID Generation', 'Unique ID generated, hash-stored, emailed', 'SELECTED'],
        ['6. CARE ID Entry', '3-attempt unlock with 24hr lockout', 'UNLOCKED'],
        ['7. Active Duty', 'View schedule, acknowledge tasks, export', 'ACTIVE'],
    ])

doc.add_paragraph(
    'Each stage gates the next, ensuring nurses complete all prerequisites before gaining '
    'full platform access. Hospital-level data isolation ensures each hospital admin '
    'sees only their own nurses, tasks, and department heads.'
)

# ══════════════════════════════════════════════
# 4. TECHNOLOGY STACK
# ══════════════════════════════════════════════
doc.add_heading('4. Technology Stack', level=1)

add_table(doc, ['Layer', 'Technology', 'Version', 'Purpose'],
    [
        ['Frontend', 'React', '19.2.0', 'UI framework'],
        ['Frontend', 'Vite', '7.3.1', 'Build tool and dev server'],
        ['Frontend', 'react-router-dom', '7.13.1', 'Client-side routing'],
        ['Frontend', 'react-hook-form', '7.71.2', 'Form management'],
        ['Frontend', 'react-hot-toast', '2.6.0', 'Toast notifications'],
        ['Frontend', 'axios', '1.13.6', 'HTTP client'],
        ['Backend', 'Python', '3.11.8', 'Runtime'],
        ['Backend', 'FastAPI', '0.104.1', 'Web framework'],
        ['Backend', 'Uvicorn', '0.24.0', 'ASGI server'],
        ['Backend', 'SQLAlchemy', '2.0.23', 'ORM'],
        ['Backend', 'Pydantic', '2.5.0', 'Data validation'],
        ['Backend', 'python-jose', '3.3.0', 'JWT token management'],
        ['Backend', 'passlib / bcrypt', '-', 'Password hashing'],
        ['Backend', 'slowapi', '0.1.9', 'Rate limiting'],
        ['Backend', 'Jinja2', '3.1.2', 'Email templates'],
        ['Database', 'PostgreSQL', '-', 'Primary database (Supabase cloud)'],
        ['Database', 'SQLite', '-', 'Local development fallback'],
        ['Storage', 'Supabase Storage', '-', 'Private document storage with signed URLs'],
        ['Email', 'Resend API', '-', 'Transactional email delivery'],
        ['Deployment', 'Netlify', '-', 'Frontend hosting'],
        ['Deployment', 'Render', '-', 'Backend hosting'],
    ])

# ══════════════════════════════════════════════
# 5. USER ROLES & FEATURES
# ══════════════════════════════════════════════
doc.add_heading('5. User Roles & Features', level=1)

doc.add_heading('Role Hierarchy', level=2)
doc.add_paragraph(
    'Platform Admin (super admin) \u2192 Hospital Admin \u2192 Department Head \u2192 Nurse'
)

# Platform Admin
doc.add_heading('5.1 Platform Admin', level=2)
platform_features = [
    'Dashboard: Pipeline stats (total nurses, KYC pending/approved/rejected, interviews today, awaiting allocation, active nurses)',
    'Nurse Registry: List, search, view documents via signed URLs, verify/reject KYC, request document re-upload, export CSV',
    'Interview Management: Create interview sessions with venue/hospital dropdown, batch assign nurses, upload results CSV, calendar view',
    'CARE ID Management: View PASSED/FAILED candidates, send CARE ID emails (single + bulk), reset lockout',
    'Hospital Management: CRUD hospitals',
    'Hospital Admin Management: Create accounts, activate/deactivate with reason',
    'Position Management: Assign positions to passed nurses, list/update',
    'Venue Master: Upload venue CSV for interview session dropdown',
    'Audit Logs: View complete admin action trail',
]
for f in platform_features:
    doc.add_paragraph(f, style='List Bullet')

# Hospital Admin
doc.add_heading('5.2 Hospital Admin', level=2)
ha_features = [
    'Dashboard: Active nurses count, total/today tasks, department-wise performance breakdown',
    'Nurse Management: View nurses scoped to their hospital only, search by specialization',
    'Task History: View all tasks belonging to their hospital',
    'Department Head Management: Create dept head accounts, list dept heads scoped to their hospital',
    'Task Assignment: Assign tasks to nurses in their hospital with specialization match enforcement',
]
for f in ha_features:
    doc.add_paragraph(f, style='List Bullet')

# Dept Head
doc.add_heading('5.3 Department Head', level=2)
dh_features = [
    'Dashboard: Nurse count, total tasks, pending, acknowledged, tasks today — all scoped to their department',
    'Nurse View: See only nurses within their department',
    'Task Assignment: Assign tasks to nurses in their department only (hard specialization enforcement)',
    'Task History: View departmental tasks with hospital isolation',
]
for f in dh_features:
    doc.add_paragraph(f, style='List Bullet')

# Nurse
doc.add_heading('5.4 Nurse', level=2)
nurse_features = [
    'Pipeline Dashboard: 4-stage view based on onboarding progress (KYC Pending, Awaiting Interview, CARE ID Entry, Full Access)',
    'Document Upload: 5 document types including Nursing License with expiry date tracking',
    'CARE ID Entry: 3-attempt system with 24-hour lockout protection',
    'Duty Schedule: View assigned tasks, acknowledge them, filter by status',
    'Export: Download duty schedule as PDF or DOCX',
    'ID Card: 3D flip card with Carenium branding and nurse details',
    'Profile Settings: Change password via OTP verification',
    'Notifications: In-app notification panel for all status changes',
]
for f in nurse_features:
    doc.add_paragraph(f, style='List Bullet')

# ══════════════════════════════════════════════
# 6. SYSTEM ARCHITECTURE
# ══════════════════════════════════════════════
doc.add_heading('6. System Architecture', level=1)

doc.add_paragraph(
    'The system follows a three-tier architecture with clear separation of concerns:'
)

arch_items = [
    ('Presentation Layer', 'React SPA hosted on Netlify with role-based routing, protected routes, and responsive design. Communicates with backend via REST API calls through axios.'),
    ('Application Layer', 'FastAPI backend deployed on Render with 6 modular routers. Handles authentication (JWT), business logic, email dispatch (Resend), file storage (Supabase), and rate limiting.'),
    ('Data Layer', 'PostgreSQL on Supabase Cloud with 11 tables. SQLAlchemy ORM handles migrations and query building. File storage uses Supabase private bucket with signed URL access.'),
]
for title, desc in arch_items:
    p = doc.add_paragraph()
    run = p.add_run(f'{title}: ')
    run.bold = True
    p.add_run(desc)

doc.add_paragraph()
doc.add_paragraph('Architecture Flow:')
add_table(doc, ['Component', 'Technology', 'Responsibility'],
    [
        ['Frontend', 'React + Vite', 'UI rendering, routing, state management'],
        ['API Gateway', 'FastAPI', 'Request handling, auth, routing'],
        ['Business Logic', 'Python routers', 'Validation, workflow orchestration'],
        ['ORM', 'SQLAlchemy', 'Database abstraction, queries'],
        ['Database', 'PostgreSQL (Supabase)', 'Persistent storage'],
        ['File Storage', 'Supabase Storage', 'Document storage with signed URLs'],
        ['Email', 'Resend API', 'Transactional emails (10+ templates)'],
        ['Auth', 'JWT (python-jose)', 'Token-based authentication'],
    ])

# ══════════════════════════════════════════════
# 7. DATABASE DESIGN
# ══════════════════════════════════════════════
doc.add_heading('7. Database Design', level=1)

doc.add_paragraph('The system uses 11 database tables managed through SQLAlchemy ORM with a custom UUID type that works across PostgreSQL and SQLite.')

doc.add_heading('Entity Relationship Summary', level=2)
doc.add_paragraph('User (admin) --belongs to--> Hospital')
doc.add_paragraph('Nurse --belongs to--> Hospital')
doc.add_paragraph('Nurse --has--> NurseDocument (1-to-many)')
doc.add_paragraph('Nurse --has--> Interview (1-to-many)')
doc.add_paragraph('Nurse --has--> Position (1-to-1)')
doc.add_paragraph('Nurse --has--> ShiftAssignment (1-to-many)')
doc.add_paragraph('Nurse --has--> Notification (1-to-many)')
doc.add_paragraph('InterviewSession --uses--> VenueMaster')

doc.add_heading('Table Definitions', level=2)

# Users
doc.add_heading('users', level=3)
doc.add_paragraph('Admin accounts for platform admin, hospital admin, and department head roles.')
add_table(doc, ['Field', 'Type', 'Notes'],
    [
        ['id', 'UUID', 'Primary key'],
        ['email', 'String', 'Unique, indexed'],
        ['password', 'String', 'bcrypt hashed'],
        ['role', 'String', 'Always "admin"'],
        ['admin_role', 'String', 'platform_admin, hospital_admin, dept_head'],
        ['hospital_id', 'UUID (FK)', 'Nullable, links to hospitals'],
        ['hospital_name', 'String', 'Denormalised for speed'],
        ['department', 'String', 'For dept_head role'],
        ['full_name', 'String', 'Display name'],
        ['is_active', 'Boolean', 'Activated by platform admin'],
        ['must_reset_password', 'Boolean', 'Force reset on first login'],
    ])

# Nurses
doc.add_heading('nurses', level=3)
doc.add_paragraph('Core nurse data with onboarding pipeline status tracking.')
add_table(doc, ['Field', 'Type', 'Notes'],
    [
        ['id', 'UUID', 'Primary key'],
        ['full_name', 'String', 'Required'],
        ['email', 'String', 'Unique, indexed'],
        ['phone', 'String', 'Required'],
        ['age', 'Integer', 'Minimum 21 years'],
        ['registration_number', 'String', 'Unique nursing council registration'],
        ['specialization', 'String', 'ICU, Home Care, Pediatrics, etc.'],
        ['password', 'String', 'bcrypt hashed'],
        ['is_verified', 'Boolean', 'KYC approval flag'],
        ['is_active', 'Boolean', 'Account active flag'],
        ['interview_status', 'String', 'PENDING / SCHEDULED / PASSED / FAILED / SELECTED / REJECTED'],
        ['hospital_id', 'UUID (FK)', 'Assigned hospital after interview pass'],
        ['care_id', 'String', 'Format: CARE-20YY-XXXX'],
        ['care_id_verified', 'Boolean', 'Correct CARE ID entry flag'],
        ['shift_unlocked', 'Boolean', 'Full access granted'],
        ['unlock_key_hash', 'String', 'SHA256 hash of CARE ID'],
        ['care_id_attempts', 'Integer', 'Max 3 before lockout'],
        ['care_id_locked_until', 'DateTime', '24-hour lockout timestamp'],
    ])

# Hospitals
doc.add_heading('hospitals', level=3)
add_table(doc, ['Field', 'Type', 'Notes'],
    [
        ['id', 'UUID', 'Primary key'],
        ['name', 'String', 'Hospital name'],
        ['location', 'String', 'Address'],
        ['city', 'String', 'City'],
        ['state', 'String', 'State'],
        ['contact_email', 'String', 'Contact email'],
        ['contact_phone', 'String', 'Contact phone'],
    ])

# ShiftAssignments
doc.add_heading('shift_assignments', level=3)
doc.add_paragraph('Duty and task records assigned to nurses.')
add_table(doc, ['Field', 'Type', 'Notes'],
    [
        ['id', 'UUID', 'Primary key'],
        ['nurse_id', 'UUID (FK)', 'Assigned nurse'],
        ['shift_date', 'Date', 'Duty date'],
        ['shift_time', 'String', 'Time slot'],
        ['task_title', 'String', 'e.g. Emergency Triage Monitoring'],
        ['task_type', 'String', 'e.g. Emergency Response, Patient Care'],
        ['priority', 'String', 'emergency / urgent / routine'],
        ['ward', 'String', 'Ward location'],
        ['specialization_required', 'String', 'Department requirement'],
        ['task_status', 'String', 'assigned / acknowledged / completed'],
        ['hospital_id', 'UUID (FK)', 'Hospital scope for isolation'],
        ['assigned_by', 'String', 'Admin email'],
    ])

# Other tables summary
doc.add_heading('Additional Tables', level=2)
add_table(doc, ['Table', 'Purpose', 'Key Relationships'],
    [
        ['nurse_documents', 'Uploaded document storage', 'FK to nurses'],
        ['interviews', 'Interview records', 'FK to nurses, location string'],
        ['interview_sessions', 'Batch interview scheduling', 'venue_name, hospital_id (FK)'],
        ['positions', 'Nurse-hospital position assignment', 'FK to nurses, FK to hospitals'],
        ['audit_logs', 'Admin action audit trail', 'FK to users, FK to nurses'],
        ['notifications', 'In-app notification system', 'FK to nurses'],
        ['venue_master', 'CSV-imported venue list', 'Standalone, used as dropdown source'],
    ])

# ══════════════════════════════════════════════
# 8. KEY WORKFLOWS
# ══════════════════════════════════════════════
doc.add_heading('8. Key Workflows', level=1)

doc.add_heading('8.1 Nurse Onboarding Pipeline', level=2)
steps = [
    ('Registration', 'Nurse creates account with personal details, specialization, and password. Welcome email sent via Resend backend task.'),
    ('Document Upload', 'Nurse uploads 5 document types. Nursing license includes expiry date tracking. Files stored in Supabase private bucket.'),
    ('KYC Review', 'Platform admin views documents via 1-hour signed URLs. Can approve, reject with reason, or request re-upload. Email notification sent on each action.'),
    ('Interview Scheduling', 'Admin creates interview session at hospital venue. Batch-assigns eligible nurses. Email notifications with venue details.'),
    ('Interview Result', 'Admin marks nurse as selected/not-selected. On selection: CARE ID generated (CARE-20YY-XXXX), SHA256 hash stored, hospital_id linked to nurse, email sent.'),
    ('CARE ID Entry', 'Nurse enters CARE ID (3 attempts). SHA256 hash comparison. On success: shift_unlocked=true, full dashboard access. On failure: 24-hour lockout.'),
    ('Active Duty', 'Nurse views shift schedule, acknowledges tasks, exports as PDF/DOCX. Department heads assign tasks with specialization enforcement.'),
]
for i, (title, desc) in enumerate(steps, 1):
    p = doc.add_paragraph()
    run = p.add_run(f'Stage {i} — {title}: ')
    run.bold = True
    p.add_run(desc)

doc.add_heading('8.2 Hospital Admin Management', level=2)
ha_flow = [
    'Platform admin creates hospital admin account with hospital name, generating a 15-character random password',
    'Account is created in deactivated state (is_active=false) for security',
    'Platform admin activates the account; hospital admin must reset password on first login',
    'Hospital admin logs in to a dashboard scoped exclusively to their hospital',
    'Hospital admin can create department head accounts for their hospital, inheriting hospital_id',
]
for i, step in enumerate(ha_flow, 1):
    doc.add_paragraph(f'{i}. {step}')

doc.add_heading('8.3 Task Assignment', level=2)
task_flow = [
    'Admin or dept head selects an active nurse (care_id_verified=true) within their scope',
    'Task details filled: shift date, time, ward, floor, task title, type, priority (emergency/urgent/routine)',
    'Backend enforces hard specialization match — nurse specialization must match task requirement',
    'Task created with status "assigned", hospital_id set from admin context',
    'In-app notification sent to nurse immediately',
    'Nurse views task on duty page, can acknowledge (status changes to "acknowledged")',
]
for i, step in enumerate(task_flow, 1):
    doc.add_paragraph(f'{i}. {step}')

doc.add_heading('8.4 Data Isolation Architecture', level=2)
doc.add_paragraph(
    'A critical design requirement was hospital-level data isolation. The implementation ensures:'
)
isolation_points = [
    'Hospital_id on Nurse model — set when nurse passes interview at a hospital venue, ensuring nurses are visible only to their hospital',
    'Hospital_id on ShiftAssignment — tasks scoped to the creating admin\'s hospital',
    'Hospital_id on User — dept heads inherit their creating hospital admin\'s hospital',
    'All hospital-admin endpoints filter queries by JWT token\'s hospital_id',
    'All dept-head endpoints filter by both hospital_id and department'
]
for p in isolation_points:
    doc.add_paragraph(p, style='List Bullet')

# ══════════════════════════════════════════════
# 9. API ENDPOINTS
# ══════════════════════════════════════════════
doc.add_heading('9. API Endpoints (63+)', level=1)

doc.add_paragraph('The backend provides 63+ REST endpoints organized across 6 routers:')

add_table(doc, ['Router', 'Endpoints', 'Scope'],
    [
        ['/auth', '4', 'Login, password reset, OTP management'],
        ['/nurses', '5', 'Registration, profile, CARE ID unlock, shift info, task acknowledgment'],
        ['/documents', '2', 'Document upload and listing'],
        ['/notifications', '2', 'List notifications, mark as read'],
        ['/admin', '30+', 'Full platform management (nurses, interviews, CARE IDs, hospitals, positions, venues, tasks)'],
        ['/hospital-admin', '5', 'Hospital-scoped operations (stats, nurses, tasks, dept heads)'],
        ['/dept', '4', 'Department-scoped operations (stats, nurses, tasks)'],
        ['/nurses/export', '1', 'PDF and DOCX duty schedule export'],
    ])

doc.add_paragraph(
    'All endpoints enforce JWT authentication with role-based access control. '
    'Hospital admin and dept head endpoints additionally enforce hospital_id scoping '
    'from the JWT token to ensure data isolation.'
)

# ══════════════════════════════════════════════
# 10. SECURITY MEASURES
# ══════════════════════════════════════════════
doc.add_heading('10. Security Measures', level=1)

security_items = [
    ('JWT Authentication', 'All endpoints (except login and registration) require a valid JWT token with 60-minute expiry. Tokens embed user role, admin_role, hospital_id for scoped access.'),
    ('Password Security', 'bcrypt password hashing with configurable rounds. Passwords never stored in plain text. Random 15-character passwords generated for admin accounts.'),
    ('CARE ID Hashing', 'CARE ID stored as SHA256 hash with random 4-digit suffix. Even database administrators cannot reverse-engineer the actual CARE ID.'),
    ('Rate Limiting', 'slowapi rate limiting on login, OTP, and registration endpoints to prevent brute force attacks.'),
    ('Document Isolation', 'Documents stored in Supabase private bucket. Admin views documents through temporary signed URLs with 1-hour expiry. No public access to document storage.'),
    ('Input Sanitization', 'Pydantic validators strip HTML tags from all text inputs to prevent XSS attacks.'),
    ('CARE ID Lockout', '3 failed attempts trigger a 24-hour lockout period. Admin override available for legitimate recovery.'),
    ('Role-Based Access', 'Every endpoint validates role and permissions before processing. Hospital-level scoping enforced at the query level.'),
    ('Audit Trail', 'All admin actions (KYC actions, interview results, account management) logged with timestamp, admin identity, and details.'),
]
for title, desc in security_items:
    p = doc.add_paragraph()
    run = p.add_run(f'{title}: ')
    run.bold = True
    p.add_run(desc)

# ══════════════════════════════════════════════
# 11. DEPLOYMENT
# ══════════════════════════════════════════════
doc.add_heading('11. Deployment', level=1)

add_table(doc, ['Component', 'Platform', 'Configuration'],
    [
        ['Frontend', 'Netlify', 'Auto-deploys from GitHub master branch. SPA redirects configured via netlify.toml. Build command: npm run build. Publish directory: dist.'],
        ['Backend', 'Render', 'Connected to GitHub repository. ASGI server with Uvicorn. Environment variables for database URL, JWT secret, Resend API key, Supabase credentials.'],
        ['Database', 'Supabase Cloud', 'PostgreSQL 15. Hosted on AWS ap-south-1. Connection pooling enabled. Backups configured.'],
        ['File Storage', 'Supabase Storage', 'Private bucket with RLS policies. Signed URL generation for document access.'],
    ])

doc.add_paragraph(
    'CI/CD Pipeline: Git push to master triggers Netlify frontend build and Render backend deployment automatically. '
    'Database migrations are run manually via scripts during deployment.'
)

# ══════════════════════════════════════════════
# 12. FUTURE SCOPE
# ══════════════════════════════════════════════
doc.add_heading('12. Future Scope', level=1)

future_items = [
    ('Patient Booking System', 'Allow care recipients to browse available nurses by specialization, location, and time slot. Book nursing care with end-to-end scheduling.'),
    ('Real-Time Notifications', 'WebSocket integration for instant task alerts, status changes, and chat between admin and nurses.'),
    ('Mobile Application', 'React Native mobile app for nurses to receive push notifications, upload documents from phone camera, and check duty schedules on-the-go.'),
    ('Advanced Analytics', 'Dashboard with nurse performance metrics, hospital utilization reports, predictive staffing recommendations using historical data.'),
    ('Payroll Integration', 'Automated salary calculation based on completed tasks, shift differentials, and overtime. Integration with payroll providers.'),
    ('Multi-Language Support', 'Regional language support for nurses across different states, starting with Hindi, Tamil, Bengali, and Telugu.'),
    ('Telemedicine Integration', 'Video consultation capabilities for remote patient monitoring and nurse-supervisor communication.'),
    ('Compliance Reporting', 'Automated reports for regulatory compliance, license renewal tracking, and audit documentation.'),
]
for title, desc in future_items:
    p = doc.add_paragraph()
    run = p.add_run(f'{title}: ')
    run.bold = True
    p.add_run(desc)

# ══════════════════════════════════════════════
# 13. CONCLUSION
# ══════════════════════════════════════════════
doc.add_heading('13. Conclusion', level=1)

doc.add_paragraph(
    'Carenium Nurse Portal successfully addresses the critical challenge of nurse workforce management '
    'in a multi-hospital ecosystem. The platform\'s pipeline-driven onboarding ensures that every nurse '
    'completes all prerequisite stages before gaining full system access, while the role-based architecture '
    'provides appropriate data visibility and operational capabilities to each stakeholder.'
)
doc.add_paragraph(
    'The hospital-level data isolation design ensures that hospital administrators see only their own '
    'staff and tasks, department heads operate within their specialization, and platform administrators '
    'maintain overarching governance. The CARE ID unlock system adds a unique security layer that protects '
    'both the platform and its users.'
)
doc.add_paragraph(
    'With 63+ API endpoints, 11 database tables, 10 email templates, and support for 4 user roles, '
    'Carenium provides a robust, scalable foundation for healthcare workforce management. '
    'The modular architecture allows for future expansion into patient booking, mobile access, '
    'and advanced analytics without requiring fundamental architectural changes.'
)

# ── Save ──
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Carenium_Nurse_Portal_Report.docx')
output_path = os.path.abspath(output_path)
doc.save(output_path)
print(f"Report saved to: {output_path}")
