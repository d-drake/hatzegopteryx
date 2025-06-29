import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import get_password_hash


def update_superuser_from_env():
    """Update superuser credentials from environment variables."""
    db = next(get_db())

    # Get credentials from environment
    email = os.getenv("SUPERUSER_EMAIL", "admin@ccdh.me")
    new_password = os.getenv("SUPERUSER_PASSWORD", "admin123456")

    # Find the superuser
    superuser = db.query(User).filter(User.email == email).first()

    if not superuser:
        print(f"Superuser with email {email} not found!")
        return

    # Update password
    superuser.hashed_password = get_password_hash(new_password)
    db.commit()

    print(f"Password updated for {superuser.email}")
    print(f"You can now log in with:")
    print(f"  Email: {email}")
    print(f"  Password: [from SUPERUSER_PASSWORD env var]")


if __name__ == "__main__":
    update_superuser_from_env()
