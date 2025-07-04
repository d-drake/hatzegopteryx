"""Security monitoring and scanning API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timezone
from database import get_db
from auth import get_current_active_superuser
from security.monitoring import SecurityMonitor, SecurityScanner
from pydantic import BaseModel

router = APIRouter()


class SecurityAlert(BaseModel):
    alert_type: str
    severity: str
    details: Dict
    timestamp: datetime


class SecurityScanResult(BaseModel):
    scan_type: str
    findings: List[Dict]
    timestamp: datetime
    recommendations: List[str]


@router.get(
    "/alerts/failed-logins", dependencies=[Depends(get_current_active_superuser)]
)
def check_failed_logins(
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Check for excessive failed login attempts."""
    monitor = SecurityMonitor(db)
    result = monitor.check_failed_login_attempts(user_id, ip_address)

    if result["triggered"]:
        # Log this check as a security event
        from auth import create_audit_log

        create_audit_log(
            db,
            user_id=None,  # System action
            action="security_alert",
            resource="failed_logins",
            success=True,
            details=result,
        )

    return result


@router.get(
    "/alerts/registration-spam", dependencies=[Depends(get_current_active_superuser)]
)
def check_registration_spam(
    ip_address: str = Query(..., description="IP address to check"),
    db: Session = Depends(get_db),
):
    """Check for registration spam from an IP address."""
    monitor = SecurityMonitor(db)
    result = monitor.check_registration_spam(ip_address)

    if result["triggered"]:
        from auth import create_audit_log

        create_audit_log(
            db,
            user_id=None,
            action="security_alert",
            resource="registration_spam",
            success=True,
            details=result,
        )

    return result


@router.get(
    "/alerts/unauthorized-access", dependencies=[Depends(get_current_active_superuser)]
)
def check_unauthorized_access(
    user_id: int = Query(..., description="User ID to check"),
    db: Session = Depends(get_db),
):
    """Check for repeated unauthorized access attempts."""
    monitor = SecurityMonitor(db)
    result = monitor.check_unauthorized_access(user_id)

    if result["triggered"]:
        from auth import create_audit_log

        create_audit_log(
            db,
            user_id=None,
            action="security_alert",
            resource="unauthorized_access",
            success=True,
            details=result,
        )

    return result


@router.get(
    "/alerts/suspicious-patterns", dependencies=[Depends(get_current_active_superuser)]
)
def get_suspicious_patterns(db: Session = Depends(get_db)):
    """Detect suspicious activity patterns."""
    monitor = SecurityMonitor(db)
    patterns = monitor.get_suspicious_patterns()

    if patterns:
        from auth import create_audit_log

        create_audit_log(
            db,
            user_id=None,
            action="security_scan",
            resource="suspicious_patterns",
            success=True,
            details={"patterns_found": len(patterns)},
        )

    return {
        "timestamp": datetime.now(timezone.utc),
        "patterns": patterns,
        "count": len(patterns),
    }


@router.get(
    "/scan/weak-passwords", dependencies=[Depends(get_current_active_superuser)]
)
def scan_weak_passwords(db: Session = Depends(get_db)):
    """Scan for users with potentially weak or old passwords."""
    scanner = SecurityScanner(db)
    results = scanner.check_weak_passwords()

    from auth import create_audit_log

    create_audit_log(
        db,
        user_id=None,
        action="security_scan",
        resource="weak_passwords",
        success=True,
        details={"users_found": len(results)},
    )

    return SecurityScanResult(
        scan_type="weak_passwords",
        findings=results,
        timestamp=datetime.now(timezone.utc),
        recommendations=[
            "Implement password expiration policy",
            "Require password changes every 90 days",
            "Use strong password requirements",
        ],
    )


@router.get(
    "/scan/inactive-users", dependencies=[Depends(get_current_active_superuser)]
)
def scan_inactive_users(db: Session = Depends(get_db)):
    """Scan for inactive users that should be disabled."""
    scanner = SecurityScanner(db)
    results = scanner.check_inactive_users()

    from auth import create_audit_log

    create_audit_log(
        db,
        user_id=None,
        action="security_scan",
        resource="inactive_users",
        success=True,
        details={"users_found": len(results)},
    )

    return SecurityScanResult(
        scan_type="inactive_users",
        findings=results,
        timestamp=datetime.now(timezone.utc),
        recommendations=[
            "Disable accounts inactive for 30+ days",
            "Implement automatic account suspension",
            "Notify users before disabling accounts",
        ],
    )


@router.get(
    "/scan/privilege-escalation", dependencies=[Depends(get_current_active_superuser)]
)
def scan_privilege_escalation(db: Session = Depends(get_db)):
    """Check for unusual privilege changes."""
    scanner = SecurityScanner(db)
    results = scanner.check_privilege_escalation()

    from auth import create_audit_log

    create_audit_log(
        db,
        user_id=None,
        action="security_scan",
        resource="privilege_escalation",
        success=True,
        details={"alerts_found": len(results)},
    )

    return SecurityScanResult(
        scan_type="privilege_escalation",
        findings=results,
        timestamp=datetime.now(timezone.utc),
        recommendations=[
            "Review all superuser grants",
            "Implement approval workflow for privilege changes",
            "Use principle of least privilege",
        ],
    )


@router.post("/alerts/test-email", dependencies=[Depends(get_current_active_superuser)])
def test_email_alerts(
    recipient: str = Query(..., description="Email address to send test alert"),
    db: Session = Depends(get_db),
):
    """Send a test security alert email."""
    monitor = SecurityMonitor(db)

    test_alert = {
        "alert_type": "test_alert",
        "severity": "low",
        "message": "This is a test security alert",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "triggered_by": "Manual test",
    }

    monitor.send_alert(test_alert, [recipient])

    return {"status": "sent", "recipient": recipient, "alert_data": test_alert}


@router.get("/dashboard", dependencies=[Depends(get_current_active_superuser)])
def security_dashboard(db: Session = Depends(get_db)):
    """Get security dashboard summary."""
    monitor = SecurityMonitor(db)
    scanner = SecurityScanner(db)

    # Get various security metrics
    suspicious_patterns = monitor.get_suspicious_patterns()
    weak_passwords = scanner.check_weak_passwords()
    inactive_users = scanner.check_inactive_users()
    privilege_changes = scanner.check_privilege_escalation()

    # Get recent security alerts from audit log
    from sqlalchemy import and_
    from models import AuditLog

    recent_alerts = (
        db.query(AuditLog)
        .filter(
            and_(
                AuditLog.action == "security_alert",
                AuditLog.created_at
                >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0),
            )
        )
        .count()
    )

    return {
        "timestamp": datetime.now(timezone.utc),
        "summary": {
            "suspicious_patterns": len(suspicious_patterns),
            "weak_passwords": len(weak_passwords),
            "inactive_users": len(inactive_users),
            "privilege_alerts": len(privilege_changes),
            "alerts_today": recent_alerts,
        },
        "recommendations": {
            "immediate": [
                (
                    f"Review {len(privilege_changes)} privilege escalation alerts"
                    if privilege_changes
                    else None
                ),
                (
                    f"Investigate {len(suspicious_patterns)} suspicious activity patterns"
                    if suspicious_patterns
                    else None
                ),
            ],
            "scheduled": [
                (
                    f"Review password policy for {len(weak_passwords)} users with old accounts"
                    if weak_passwords
                    else None
                ),
                (
                    f"Disable {len(inactive_users)} inactive accounts"
                    if inactive_users
                    else None
                ),
            ],
        },
        "health_status": (
            "critical"
            if privilege_changes or len(suspicious_patterns) > 5
            else "warning" if suspicious_patterns or weak_passwords else "good"
        ),
    }
