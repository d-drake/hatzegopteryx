"""Security monitoring and alerting system."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from models import AuditLog, User
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)


class SecurityMonitor:
    """Monitor security events and trigger alerts."""

    def __init__(self, db: Session):
        self.db = db
        self.alert_thresholds = {
            "failed_logins": {"count": 5, "window_minutes": 10, "per_user": True},
            "registration_attempts": {
                "count": 10,
                "window_minutes": 60,
                "per_ip": True,
            },
            "rate_limit_violations": {"count": 20, "window_minutes": 5, "per_ip": True},
            "unauthorized_access": {"count": 3, "window_minutes": 15, "per_user": True},
            "suspicious_activity": {"count": 10, "window_minutes": 30, "per_ip": True},
        }

    def check_failed_login_attempts(
        self, user_id: Optional[int] = None, ip_address: Optional[str] = None
    ) -> Dict:
        """Check for excessive failed login attempts."""
        window_start = datetime.now(timezone.utc) - timedelta(
            minutes=self.alert_thresholds["failed_logins"]["window_minutes"]
        )

        query = self.db.query(AuditLog).filter(
            and_(
                AuditLog.action == "login",
                AuditLog.success.is_(False),
                AuditLog.created_at >= window_start,
            )
        )

        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if ip_address:
            query = query.filter(AuditLog.ip_address == ip_address)

        failed_attempts = query.count()
        threshold = self.alert_thresholds["failed_logins"]["count"]

        return {
            "alert_type": "failed_logins",
            "count": failed_attempts,
            "threshold": threshold,
            "triggered": failed_attempts >= threshold,
            "user_id": user_id,
            "ip_address": ip_address,
            "window_minutes": self.alert_thresholds["failed_logins"]["window_minutes"],
        }

    def check_registration_spam(self, ip_address: str) -> Dict:
        """Check for excessive registration attempts from an IP."""
        window_start = datetime.now(timezone.utc) - timedelta(
            minutes=self.alert_thresholds["registration_attempts"]["window_minutes"]
        )

        attempts = (
            self.db.query(AuditLog)
            .filter(
                and_(
                    AuditLog.action == "register",
                    AuditLog.ip_address == ip_address,
                    AuditLog.created_at >= window_start,
                )
            )
            .count()
        )

        threshold = self.alert_thresholds["registration_attempts"]["count"]

        return {
            "alert_type": "registration_spam",
            "count": attempts,
            "threshold": threshold,
            "triggered": attempts >= threshold,
            "ip_address": ip_address,
            "window_minutes": self.alert_thresholds["registration_attempts"][
                "window_minutes"
            ],
        }

    def check_unauthorized_access(self, user_id: int) -> Dict:
        """Check for repeated unauthorized access attempts."""
        window_start = datetime.now(timezone.utc) - timedelta(
            minutes=self.alert_thresholds["unauthorized_access"]["window_minutes"]
        )

        attempts = (
            self.db.query(AuditLog)
            .filter(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.success.is_(False),
                    AuditLog.details.op("->>")("error").isnot(None),
                    AuditLog.created_at >= window_start,
                )
            )
            .count()
        )

        threshold = self.alert_thresholds["unauthorized_access"]["count"]

        return {
            "alert_type": "unauthorized_access",
            "count": attempts,
            "threshold": threshold,
            "triggered": attempts >= threshold,
            "user_id": user_id,
            "window_minutes": self.alert_thresholds["unauthorized_access"][
                "window_minutes"
            ],
        }

    def get_suspicious_patterns(self) -> List[Dict]:
        """Detect suspicious activity patterns."""
        alerts = []
        window_start = datetime.now(timezone.utc) - timedelta(hours=1)

        # Check for users with multiple IP addresses
        user_ips = (
            self.db.query(
                AuditLog.user_id,
                func.count(func.distinct(AuditLog.ip_address)).label("ip_count"),
            )
            .filter(
                and_(AuditLog.user_id.isnot(None), AuditLog.created_at >= window_start)
            )
            .group_by(AuditLog.user_id)
            .having(func.count(func.distinct(AuditLog.ip_address)) > 3)
            .all()
        )

        for user_id, ip_count in user_ips:
            alerts.append(
                {
                    "alert_type": "multiple_ips",
                    "user_id": user_id,
                    "ip_count": ip_count,
                    "severity": "medium" if ip_count < 5 else "high",
                }
            )

        # Check for rapid action sequences
        rapid_actions = (
            self.db.query(
                AuditLog.user_id,
                AuditLog.ip_address,
                func.count(AuditLog.id).label("action_count"),
            )
            .filter(AuditLog.created_at >= window_start)
            .group_by(AuditLog.user_id, AuditLog.ip_address)
            .having(func.count(AuditLog.id) > 50)
            .all()
        )

        for user_id, ip_address, action_count in rapid_actions:
            alerts.append(
                {
                    "alert_type": "rapid_actions",
                    "user_id": user_id,
                    "ip_address": ip_address,
                    "action_count": action_count,
                    "severity": "high",
                }
            )

        return alerts

    def send_alert(self, alert_data: Dict, recipients: List[str]):
        """Send security alert via email."""
        if not os.getenv("SMTP_HOST"):
            logger.warning("SMTP not configured, logging alert instead")
            logger.error(f"SECURITY ALERT: {alert_data}")
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = os.getenv("SMTP_FROM", "security@ccdh.me")
            msg["To"] = ", ".join(recipients)
            msg["Subject"] = (
                f"Security Alert: {alert_data.get('alert_type', 'Unknown')}"
            )

            body = self._format_alert_email(alert_data)
            msg.attach(MIMEText(body, "html"))

            smtp_host = os.getenv("SMTP_HOST")
            if not smtp_host:
                logger.error("SMTP_HOST not configured")
                return

            with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", 587))) as server:
                server.starttls()
                smtp_user = os.getenv("SMTP_USER")
                smtp_pass = os.getenv("SMTP_PASS")
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)

            logger.info(f"Security alert sent to {recipients}")
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")

    def _format_alert_email(self, alert_data: Dict) -> str:
        """Format alert data as HTML email."""
        alert_type = alert_data.get("alert_type", "Unknown")
        severity = alert_data.get("severity", "medium")

        severity_colors = {"low": "#3B82F6", "medium": "#F59E0B", "high": "#EF4444"}

        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: {severity_colors.get(severity, "#000")};">Security Alert: {alert_type}</h2>
            <p>A security event has been detected that requires your attention.</p>
            
            <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Field</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Value</th>
                </tr>
        """

        for key, value in alert_data.items():
            if key not in ["alert_type", "severity"]:
                html += f"""
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">{key.replace("_", " ").title()}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{value}</td>
                </tr>
                """

        html += """
            </table>
            
            <p style="margin-top: 20px; color: #666;">
                This is an automated security alert from CCDH Security System.
            </p>
        </body>
        </html>
        """

        return html


class SecurityScanner:
    """Perform security scans and vulnerability checks."""

    def __init__(self, db: Session):
        self.db = db

    def check_weak_passwords(self) -> List[Dict]:
        """Check for potentially weak passwords (based on account age)."""
        # For now, check users with accounts older than 90 days
        # In production, you would track password_changed_at
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)

        old_accounts = self.db.query(User).filter(User.created_at < cutoff_date).all()

        return [
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "days_since_created": (
                    datetime.now(timezone.utc) - user.created_at
                ).days,
                "recommendation": "Consider implementing password rotation policy",
            }
            for user in old_accounts
        ]

    def check_inactive_users(self) -> List[Dict]:
        """Check for inactive users that should be disabled."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

        # Get last activity for each user
        last_activities = (
            self.db.query(
                AuditLog.user_id, func.max(AuditLog.created_at).label("last_activity")
            )
            .filter(AuditLog.user_id.isnot(None))
            .group_by(AuditLog.user_id)
            .subquery()
        )

        # Find users with no recent activity
        inactive_users = (
            self.db.query(User)
            .outerjoin(last_activities, User.id == last_activities.c.user_id)
            .filter(
                and_(
                    User.is_active.is_(True),
                    func.coalesce(last_activities.c.last_activity, User.created_at)
                    < cutoff_date,
                )
            )
            .all()
        )

        return [
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "recommendation": "Consider disabling inactive account",
            }
            for user in inactive_users
        ]

    def check_privilege_escalation(self) -> List[Dict]:
        """Check for unusual privilege changes."""
        window_start = datetime.now(timezone.utc) - timedelta(days=7)

        privilege_changes = (
            self.db.query(AuditLog)
            .filter(
                and_(
                    AuditLog.action.in_(["update_user", "create_user"]),
                    AuditLog.details.op("->>")("is_superuser").isnot(None),
                    AuditLog.created_at >= window_start,
                )
            )
            .all()
        )

        alerts = []
        for log in privilege_changes:
            if log.details.get("is_superuser") is True:
                alerts.append(
                    {
                        "user_id": log.user_id,
                        "target_user": log.resource,
                        "action": log.action,
                        "timestamp": log.created_at.isoformat(),
                        "severity": "high",
                        "recommendation": "Review superuser privilege grant",
                    }
                )

        return alerts
