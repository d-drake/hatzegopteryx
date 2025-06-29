import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User
from auth import get_password_hash
from datetime import datetime, timezone


def create_superuser(email: str, username: str, password: str):
    """Create a superuser in the database."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = (
            db.query(User)
            .filter((User.email == email) | (User.username == username))
            .first()
        )

        if existing_user:
            print(f"User with email {email} or username {username} already exists")
            return

        # Create superuser
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

        print(f"Superuser created successfully:")
        print(f"  ID: {superuser.id}")
        print(f"  Email: {superuser.email}")
        print(f"  Username: {superuser.username}")
        print(f"  Is Active: {superuser.is_active}")
        print(f"  Is Superuser: {superuser.is_superuser}")

    finally:
        db.close()


if __name__ == "__main__":
    # Default superuser credentials for development
    # IMPORTANT: Change these in production!
    email = os.getenv("SUPERUSER_EMAIL", "admin@ccdh.me")
    username = os.getenv("SUPERUSER_USERNAME", "admin")
    password = os.getenv("SUPERUSER_PASSWORD", "admin123456")

    print("Creating superuser...")
    create_superuser(email, username, password)
    print("Done!")
