from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List
import os
from pathlib import Path

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@hatzegopteryx.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_TLS", "true").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL", "false").lower() == "true",
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_registration_notification_to_admins(
    admin_emails: List[EmailStr],
    registration_email: str,
    registration_username: str,
    registration_id: int,
    app_url: str
):
    """Send email notification to admins about a new registration request."""
    subject = f"New User Registration Request - {registration_username}"
    
    body = f"""
    <html>
        <body>
            <h2>New User Registration Request</h2>
            <p>A new user has requested access to Hatzegopteryx:</p>
            <ul>
                <li><strong>Email:</strong> {registration_email}</li>
                <li><strong>Username:</strong> {registration_username}</li>
                <li><strong>Request ID:</strong> {registration_id}</li>
            </ul>
            <p>Please log in to the admin panel to approve or reject this request:</p>
            <p><a href="{app_url}/admin/registrations">View Registration Requests</a></p>
        </body>
    </html>
    """
    
    message = MessageSchema(
        subject=subject,
        recipients=admin_emails,
        body=body,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_registration_approved_email(
    user_email: EmailStr,
    username: str,
    app_url: str
):
    """Send welcome email to user after registration approval."""
    subject = "Welcome to Hatzegopteryx - Registration Approved"
    
    body = f"""
    <html>
        <body>
            <h2>Welcome to Hatzegopteryx!</h2>
            <p>Hi {username},</p>
            <p>Your registration has been approved by an administrator.</p>
            <p>You can now log in to the application using your email and password:</p>
            <p><a href="{app_url}/login">Log In to Hatzegopteryx</a></p>
            <p>If you have any questions, please contact your administrator.</p>
            <p>Best regards,<br>The Hatzegopteryx Team</p>
        </body>
    </html>
    """
    
    message = MessageSchema(
        subject=subject,
        recipients=[user_email],
        body=body,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_registration_rejected_email(
    user_email: EmailStr,
    username: str
):
    """Send rejection email to user after registration denial."""
    subject = "Hatzegopteryx - Registration Update"
    
    body = f"""
    <html>
        <body>
            <h2>Registration Update</h2>
            <p>Hi {username},</p>
            <p>Thank you for your interest in Hatzegopteryx.</p>
            <p>Unfortunately, your registration request has not been approved at this time.</p>
            <p>If you believe this is an error or have questions, please contact your administrator.</p>
            <p>Best regards,<br>The Hatzegopteryx Team</p>
        </body>
    </html>
    """
    
    message = MessageSchema(
        subject=subject,
        recipients=[user_email],
        body=body,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)