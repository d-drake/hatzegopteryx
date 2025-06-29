import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import get_password_hash


def reset_superuser_password():
    """Reset the superuser password to 'admin123'."""
    db = next(get_db())

    # Find the superuser
    superuser = db.query(User).filter(User.email == "admin@ccdh.me").first()

    if not superuser:
        print("Superuser not found!")
        return

    # Update password
    superuser.hashed_password = get_password_hash("admin123")
    db.commit()

    print(f"Password reset for {superuser.email}")
    print("New password: admin123")


if __name__ == "__main__":
    reset_superuser_password()
