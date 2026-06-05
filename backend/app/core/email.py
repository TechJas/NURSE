import resend
from app.core.config import settings
from jinja2 import Environment, FileSystemLoader
from pathlib import Path

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

def send_email(to_email: str, subject: str, template_name: str, context: dict):
    if not settings.RESEND_API_KEY:
        print("Error: RESEND_API_KEY not found in settings.")
        return False

    resend.api_key = settings.RESEND_API_KEY

    try:
        template = env.get_template(template_name)
        html_content = template.render(**context)
    except Exception as e:
        print(f"Error rendering template {template_name}: {str(e)}")
        return False

    params = {
        "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    try:
        email = resend.Emails.send(params)
        print(f"Email sent to {to_email}. ID: {email.get('id')}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False
