from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List
import os
from pathlib import Path

# Email configuration from centralized config
from config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_STARTTLS=settings.mail_tls,
    MAIL_SSL_TLS=settings.mail_ssl,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


async def send_registration_notification_to_admins(
    admin_emails: List[EmailStr],
    registration_email: str,
    registration_username: str,
    registration_id: int,
    app_url: str,
):
    """Send email notification to admins about a new registration request."""
    subject = f"New User Registration Request - {registration_username}"

    body = f"""
    <html>
        <body>
            <h2>New User Registration Request</h2>
            <p>A new user has requested access to ccdh:</p>
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
        subject=subject, recipients=admin_emails, body=body, subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_registration_approved_email(
    user_email: EmailStr, username: str, app_url: str
):
    """Send welcome email to user after registration approval."""
    subject = "Welcome to CCDH - Registration Approved"

    body = f"""
    <html>
        <body>
            <h2>Welcome to CCDH!</h2>
            <p>Hi {username},</p>
            <p>Your registration has been approved by an administrator.</p>
            <p>You can now log in to the application using your email and password:</p>
            <p><a href="{app_url}/login">Log In to CCDH</a></p>
            <p>If you have any questions, please contact your administrator.</p>
            <p>Best regards,<br>The CCDH Team</p>
        </body>
    </html>
    """

    message = MessageSchema(
        subject=subject, recipients=[user_email], body=body, subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_registration_rejected_email(user_email: EmailStr, username: str):
    """Send rejection email to user after registration denial."""
    subject = "CCDH - Registration Update"

    body = f"""
    <html>
        <body>
            <h2>Registration Update</h2>
            <p>Hi {username},</p>
            <p>Thank you for your interest in CCDH.</p>
            <p>Unfortunately, your registration request has not been approved at this time.</p>
            <p>If you believe this is an error or have questions, please contact your administrator.</p>
            <p>Best regards,<br>The CCDH Team</p>
        </body>
    </html>
    """

    message = MessageSchema(
        subject=subject, recipients=[user_email], body=body, subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
