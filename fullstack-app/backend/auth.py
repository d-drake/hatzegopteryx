from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import secrets
import os
from models import User, RefreshToken, AuditLog, BlacklistedToken
from database import get_db

# Password hashing configuration using Argon2id
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

# JWT configuration from centralized config
from config import settings

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days

# Security scheme
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using Argon2id."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password using Argon2id."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add JWT ID for blacklisting support
    jti = secrets.token_urlsafe(32)
    to_encode.update({"exp": expire, "type": "access", "jti": jti})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT refresh token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Add JWT ID for blacklisting support
    jti = secrets.token_urlsafe(32)
    to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str, db: Optional[Session] = None) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Check if token is blacklisted (if db session provided)
        if db and "jti" in payload:
            blacklisted = db.query(BlacklistedToken).filter(
                BlacklistedToken.token_jti == payload["jti"]
            ).first()
            if blacklisted:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
        
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def blacklist_token(db: Session, token: str, user_id: int, reason: str = "logout"):
    """Add a token to the blacklist."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if not jti:
            return  # Old token without JTI, skip
        
        # Check if already blacklisted
        existing = db.query(BlacklistedToken).filter(
            BlacklistedToken.token_jti == jti
        ).first()
        if existing:
            return
        
        # Add to blacklist
        blacklisted = BlacklistedToken(
            token_jti=jti,
            token_type=payload.get("type", "unknown"),
            user_id=user_id,
            expires_at=datetime.fromtimestamp(payload.get("exp", 0), tz=timezone.utc),
            reason=reason
        )
        db.add(blacklisted)
        db.commit()
    except Exception:
        # Silently fail - don't break logout if blacklisting fails
        pass

def authenticate_user(db: Session, email: str, password: str) -> Union[User, bool]:
    """Authenticate a user by email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    if not user.is_active:
        return False
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token."""
    token = credentials.credentials
    payload = verify_token(token, "access", db)
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    return user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current user if they are a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def create_audit_log(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource: Optional[str],
    success: bool,
    request: Optional[Request] = None,
    details: Optional[dict] = None
):
    """Create an audit log entry."""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        success=success,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
        details=details
    )
    db.add(audit_log)
    db.commit()
    return audit_log

def save_refresh_token(db: Session, user_id: int, token: str, expires_at: datetime):
    """Save a refresh token to the database."""
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(refresh_token)
    db.commit()
    return refresh_token

def invalidate_refresh_token(db: Session, token: str):
    """Invalidate a refresh token by removing it from the database."""
    db.query(RefreshToken).filter(RefreshToken.token == token).delete()
    db.commit()

def invalidate_all_user_tokens(db: Session, user_id: int):
    """Invalidate all refresh tokens for a user."""
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
    db.commit()

def clean_expired_tokens(db: Session):
    """Remove expired refresh tokens from the database."""
    db.query(RefreshToken).filter(
        RefreshToken.expires_at < datetime.now(timezone.utc)
    ).delete()
    db.commit()