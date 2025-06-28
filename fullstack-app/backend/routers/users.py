from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import os

from database import get_db
from models import User, RegistrationRequest
from schemas import UserResponse, UserUpdate, UserCreate
from auth import get_password_hash, create_audit_log
from permissions import require_superuser
from email_service import send_registration_approved_email, send_registration_rejected_email

router = APIRouter()

@router.get("/", response_model=List[UserResponse], dependencies=[Depends(require_superuser)])
def get_users(
    skip: int = 0,
    limit: int = Query(default=50, le=100),
    is_active: Optional[bool] = None,
    is_superuser: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all users (superuser only)."""
    query = db.query(User)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_superuser is not None:
        query = query.filter(User.is_superuser == is_superuser)
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/pending-registrations", response_model=List[dict], dependencies=[Depends(require_superuser)])
def get_pending_registrations(
    db: Session = Depends(get_db)
):
    """Get all pending registration requests (superuser only)."""
    registrations = db.query(RegistrationRequest).filter(
        RegistrationRequest.approved == None,
        RegistrationRequest.expires_at > datetime.now(timezone.utc)
    ).all()
    
    return [
        {
            "id": reg.id,
            "email": reg.email,
            "username": reg.username,
            "created_at": reg.created_at,
            "expires_at": reg.expires_at
        }
        for reg in registrations
    ]

@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_superuser)])
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific user by ID (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.post("/", response_model=UserResponse, dependencies=[Depends(require_superuser)])
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Create a new user (superuser only)."""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        is_active=True,
        is_superuser=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    create_audit_log(
        db, current_user.id, "create_user", f"user:{new_user.id}", True,
        details={"email": new_user.email, "username": new_user.username}
    )
    
    return new_user

@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_superuser)])
def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Update a user (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow superusers to remove their own superuser status
    if user_id == current_user.id and user_update.is_superuser is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own superuser status"
        )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    create_audit_log(
        db, current_user.id, "update_user", f"user:{user.id}", True,
        details=update_data
    )
    
    return user

@router.delete("/{user_id}", dependencies=[Depends(require_superuser)])
def delete_user(
    user_id: int,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Delete a user (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow superusers to delete themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    create_audit_log(
        db, current_user.id, "delete_user", f"user:{user_id}", True,
        details={"email": user.email, "username": user.username}
    )
    
    return {"message": "User deleted successfully"}

@router.post("/approve-registration/{registration_id}", response_model=UserResponse, dependencies=[Depends(require_superuser)])
def approve_registration(
    registration_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Approve a registration request and create the user (superuser only)."""
    registration = db.query(RegistrationRequest).filter(
        RegistrationRequest.id == registration_id
    ).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration request not found"
        )
    
    if registration.approved is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration already processed"
        )
    
    if registration.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration request has expired"
        )
    
    # Create the user
    new_user = User(
        email=registration.email,
        username=registration.username,
        hashed_password=registration.hashed_password,
        is_active=True,
        is_superuser=False
    )
    
    db.add(new_user)
    
    # Update registration request
    registration.approved = True
    registration.approved_by = current_user.id
    registration.approved_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(new_user)
    
    create_audit_log(
        db, current_user.id, "approve_registration", f"user:{new_user.id}", True,
        details={"email": new_user.email, "username": new_user.username}
    )
    
    # Send welcome email to user
    app_url = os.getenv("APP_URL", "http://localhost:3000")
    background_tasks.add_task(
        send_registration_approved_email,
        new_user.email,
        new_user.username,
        app_url
    )
    
    return new_user

@router.post("/reject-registration/{registration_id}", dependencies=[Depends(require_superuser)])
def reject_registration(
    registration_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Reject a registration request (superuser only)."""
    registration = db.query(RegistrationRequest).filter(
        RegistrationRequest.id == registration_id
    ).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration request not found"
        )
    
    if registration.approved is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration already processed"
        )
    
    # Update registration request
    registration.approved = False
    registration.approved_by = current_user.id
    registration.approved_at = datetime.now(timezone.utc)
    
    db.commit()
    
    create_audit_log(
        db, current_user.id, "reject_registration", f"registration:{registration_id}", True,
        details={"email": registration.email, "username": registration.username}
    )
    
    # Send rejection email to user
    background_tasks.add_task(
        send_registration_rejected_email,
        registration.email,
        registration.username
    )
    
    return {"message": "Registration rejected"}