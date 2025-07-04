from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    Response,
    BackgroundTasks,
)
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
import os

from database import get_db
from models import User, RefreshToken, RegistrationRequest as RegistrationRequestModel
from schemas import (
    LoginRequest,
    Token,
    TokenRefresh,
    UserResponse,
    RegistrationRequest,
    RegistrationResponse,
)
from auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    save_refresh_token,
    invalidate_refresh_token,
    invalidate_all_user_tokens,
    verify_token,
    create_audit_log,
    blacklist_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
    security,
)
from email_service import send_registration_notification_to_admins

router = APIRouter()


@router.post("/register", response_model=RegistrationResponse)
async def register(
    request: Request,
    registration: RegistrationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Register a new user. This creates a registration request that must be approved by a superuser.
    """
    # Check if email or username already exists
    existing_user = (
        db.query(User)
        .filter(
            (User.email == registration.email)
            | (User.username == registration.username)
        )
        .first()
    )

    if existing_user:
        create_audit_log(
            db,
            None,
            "registration_attempt",
            registration.email,
            False,
            request,
            {"reason": "email_or_username_exists"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )

    # Check for pending registration request
    existing_request = (
        db.query(RegistrationRequestModel)
        .filter(
            (RegistrationRequestModel.email == registration.email)
            | (RegistrationRequestModel.username == registration.username)
        )
        .filter(RegistrationRequestModel.approved.is_(None))
        .first()
    )

    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration request already pending",
        )

    # Create registration request
    hashed_password = get_password_hash(registration.password)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    registration_request = RegistrationRequestModel(
        email=registration.email,
        username=registration.username,
        hashed_password=hashed_password,
        token=token,
        expires_at=expires_at,
    )

    db.add(registration_request)
    db.commit()
    db.refresh(registration_request)

    create_audit_log(
        db,
        None,
        "registration_request",
        registration.email,
        True,
        request,
        {"username": registration.username},
    )

    # Send email to superusers for approval
    superusers = (
        db.query(User)
        .filter(User.is_superuser.is_(True), User.is_active.is_(True))
        .all()
    )
    if superusers:
        admin_emails = [user.email for user in superusers]
        app_url = os.getenv("APP_URL", "http://localhost:3000")

        background_tasks.add_task(
            send_registration_notification_to_admins,
            admin_emails,
            registration_request.email,
            registration_request.username,
            registration_request.id,
            app_url,
        )

    return RegistrationResponse(
        id=registration_request.id,
        email=registration_request.email,
        username=registration_request.username,
        message="Registration request submitted. Awaiting approval from administrator.",
    )


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with email and password. Returns access and refresh tokens.
    """
    user = authenticate_user(db, login_data.email, login_data.password)

    if not user:
        create_audit_log(
            db,
            None,
            "login_attempt",
            login_data.email,
            False,
            request,
            {"reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Save refresh token to database
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    save_refresh_token(db, user.id, refresh_token, expires_at)

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="strict",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    create_audit_log(db, user.id, "login", None, True, request)

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Logout the current user. Invalidates all refresh tokens and blacklists the access token.
    """
    # Blacklist the current access token
    blacklist_token(db, credentials.credentials, current_user.id, "logout")

    # Invalidate all user refresh tokens
    invalidate_all_user_tokens(db, current_user.id)

    # Clear refresh token cookie
    response.delete_cookie(key="refresh_token")

    create_audit_log(db, current_user.id, "logout", None, True, request)

    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response,
    token_data: TokenRefresh,
    db: Session = Depends(get_db),
):
    """
    Refresh the access token using a valid refresh token.
    """
    try:
        # Verify refresh token
        payload = verify_token(token_data.refresh_token, "refresh", db)
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
            )
        user_id = int(user_id_str)

        # Check if refresh token exists in database
        refresh_token_db = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token == token_data.refresh_token,
                RefreshToken.user_id == user_id,
            )
            .first()
        )

        if not refresh_token_db:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

        # Check if token is expired
        if refresh_token_db.expires_at < datetime.now(timezone.utc):
            invalidate_refresh_token(db, token_data.refresh_token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired"
            )

        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Create new tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Invalidate old refresh token
        invalidate_refresh_token(db, token_data.refresh_token)

        # Save new refresh token
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=REFRESH_TOKEN_EXPIRE_DAYS
        )
        save_refresh_token(db, user.id, new_refresh_token, expires_at)

        # Update refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=True,  # Set to True in production with HTTPS
            samesite="strict",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

        create_audit_log(db, user.id, "token_refresh", None, True, request)

        return Token(access_token=access_token, refresh_token=new_refresh_token)

    except HTTPException:
        raise
    except Exception as e:
        create_audit_log(
            db, None, "token_refresh", None, False, request, {"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information.
    """
    return current_user
