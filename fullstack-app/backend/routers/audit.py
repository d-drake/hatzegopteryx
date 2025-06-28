from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from database import get_db
from models import AuditLog, User
from permissions import require_superuser
from schemas import AuditLogResponse

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse], dependencies=[Depends(require_superuser)])
def get_audit_logs(
    skip: int = 0,
    limit: int = Query(default=100, le=1000),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    status: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    Get audit logs with optional filtering (superuser only).
    """
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.id, isouter=True)
    
    # Apply filters
    filters = []
    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)
    if action:
        filters.append(AuditLog.action.contains(action))
    if status is not None:
        filters.append(AuditLog.success == status)
    if start_date:
        filters.append(AuditLog.created_at >= start_date)
    if end_date:
        filters.append(AuditLog.created_at <= end_date)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())
    
    # Apply pagination
    logs = query.offset(skip).limit(limit).all()
    
    # Convert to response model with user info
    return [
        AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user={"username": log.user.username, "email": log.user.email} if log.user else None,
            action=log.action,
            resource=log.resource,
            status=log.success,
            details=log.details,
            ip_address=str(log.ip_address) if log.ip_address else None,
            user_agent=log.user_agent,
            created_at=log.created_at
        )
        for log in logs
    ]

@router.get("/actions", response_model=List[str], dependencies=[Depends(require_superuser)])
def get_audit_actions(db: Session = Depends(get_db)):
    """
    Get list of unique audit log actions (superuser only).
    """
    actions = db.query(AuditLog.action).distinct().all()
    return [action[0] for action in actions]

@router.get("/stats", dependencies=[Depends(require_superuser)])
def get_audit_stats(
    days: int = Query(default=7, le=30),
    db: Session = Depends(get_db)
):
    """
    Get audit log statistics for the last N days (superuser only).
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Total logs
    total_logs = db.query(AuditLog).filter(
        AuditLog.created_at >= start_date
    ).count()
    
    # Failed attempts
    failed_attempts = db.query(AuditLog).filter(
        and_(
            AuditLog.created_at >= start_date,
            AuditLog.success == False
        )
    ).count()
    
    # Login attempts
    login_attempts = db.query(AuditLog).filter(
        and_(
            AuditLog.created_at >= start_date,
            AuditLog.action.in_(["login", "login_attempt"])
        )
    ).count()
    
    # Registration attempts
    registration_attempts = db.query(AuditLog).filter(
        and_(
            AuditLog.created_at >= start_date,
            AuditLog.action.in_(["register", "registration_attempt"])
        )
    ).count()
    
    # Most active users
    active_users = db.query(
        User.username,
        User.email,
        db.func.count(AuditLog.id).label("action_count")
    ).join(AuditLog).filter(
        AuditLog.created_at >= start_date
    ).group_by(User.id).order_by(
        db.func.count(AuditLog.id).desc()
    ).limit(5).all()
    
    return {
        "period_days": days,
        "total_logs": total_logs,
        "failed_attempts": failed_attempts,
        "login_attempts": login_attempts,
        "registration_attempts": registration_attempts,
        "most_active_users": [
            {"username": u[0], "email": u[1], "actions": u[2]}
            for u in active_users
        ]
    }