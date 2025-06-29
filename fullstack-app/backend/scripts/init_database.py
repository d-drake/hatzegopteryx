#!/usr/bin/env python3
"""
Initialize database with tables and superuser.
Can be run locally or via Lambda invocation.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base, SessionLocal
from models import User
from auth import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize database tables and create superuser."""
    try:
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Create superuser
        db = SessionLocal()
        try:
            # Check if superuser already exists
            email = os.getenv("SUPERUSER_EMAIL", "admin@ccdh.me")
            existing_user = db.query(User).filter(User.email == email).first()
            
            if existing_user:
                logger.info(f"Superuser {email} already exists")
                return {"status": "exists", "email": email}
            
            # Create superuser
            username = os.getenv("SUPERUSER_USERNAME", "admin")
            password = os.getenv("SUPERUSER_PASSWORD", "admin123456")
            
            logger.info(f"Creating superuser: {email}")
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
            
            logger.info(f"Superuser created successfully: {email}")
            return {
                "status": "created",
                "id": str(superuser.id),
                "email": superuser.email,
                "username": superuser.username
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return {"status": "error", "message": str(e)}

def lambda_handler(event, context):
    """Lambda handler for database initialization."""
    result = init_database()
    return {
        "statusCode": 200,
        "body": result
    }

if __name__ == "__main__":
    result = init_database()
    print(f"Result: {result}")