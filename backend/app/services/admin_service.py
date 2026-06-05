from app.database.models import Nurse
from app.core.email import send_email
from fastapi import BackgroundTasks

def send_activation_email(email: str, background_tasks: BackgroundTasks):
    subject = "Account Activated - MediLogistics"
    context = {"email": email}
    background_tasks.add_task(send_email, email, subject, "email/activation.html", context)

def send_verification_email(email: str, full_name: str, background_tasks: BackgroundTasks):
    subject = "KYC Verified - MediLogistics"
    context = {"name": full_name}
    background_tasks.add_task(send_email, email, subject, "email/verification.html", context)

def send_kyc_rejected_email(email: str, nurse_name: str, rejection_reason: str, background_tasks: BackgroundTasks):
    subject = "KYC Documents Update Required - Carenium"
    context = {"nurse_name": nurse_name, "rejection_reason": rejection_reason}
    background_tasks.add_task(send_email, email, subject, "email/kyc_rejected.html", context)

def approve_nurse(nurse_id, db, background_tasks: BackgroundTasks):
    nurse = db.query(Nurse).get(nurse_id)
    if nurse:
        nurse.is_verified = True
        nurse.is_active = True
        db.commit()
        send_activation_email(nurse.email, background_tasks)
    else:
        print(f"Nurse {nurse_id} not found")
