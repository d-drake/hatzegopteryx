"""System management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import get_password_hash
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/init-superuser")
def init_superuser(
    db: Session = Depends(get_db),
):
    """Initialize superuser if none exists. Can be called without authentication."""
    try:
        # Check if any user exists
        user_count = db.query(User).count()
        if user_count > 0:
            return {"status": "exists", "message": "Users already exist in the system"}

        # Create superuser from environment variables
        email = os.getenv("SUPERUSER_EMAIL", "admin@ccdh.me")
        username = os.getenv("SUPERUSER_USERNAME", "admin")
        password = os.getenv("SUPERUSER_PASSWORD", "admin123456")

        # Check if this specific user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            return {"status": "exists", "email": email}

        hashed_password = get_password_hash(password)
        superuser = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=True,
        )

        db.add(superuser)
        db.commit()
        db.refresh(superuser)

        logger.info(f"Superuser created: {email}")

        return {
            "status": "created",
            "id": str(superuser.id),
            "email": superuser.email,
            "username": superuser.username,
        }

    except Exception as e:
        logger.error(f"Error creating superuser: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-superuser")
def check_superuser(
    db: Session = Depends(get_db),
):
    """Check if superuser exists."""
    email = os.getenv("SUPERUSER_EMAIL", "admin@ccdh.me")
    user = db.query(User).filter(User.email == email).first()

    if user:
        return {
            "exists": True,
            "email": user.email,
            "username": user.username,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
        }
    else:
        return {"exists": False}
