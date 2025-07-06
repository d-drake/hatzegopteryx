import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routers import (
    items,
    spc_cd_l1,
    spc_reg_l1,
    spc_limits,
    auth,
    users,
    audit,
    security,
    system,
)
from middleware import SecurityHeadersMiddleware, RateLimitMiddleware

# Initialize Sentry only if DSN is provided and not in Lambda
if os.getenv("SENTRY_DSN") and not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

Base.metadata.create_all(bind=engine)


def init_superuser():
    """Initialize superuser on first run."""
    from models import User
    from auth import get_password_hash
    from sqlalchemy.orm import Session

    db = Session(bind=engine)
    try:
        # Check if any user exists
        user_count = db.query(User).count()
        if user_count == 0:
            # Create superuser from environment variables
            email = os.getenv("SUPERUSER_EMAIL", "admin@ccdh.me")
            username = os.getenv("SUPERUSER_USERNAME", "admin")
            password = os.getenv("SUPERUSER_PASSWORD", "admin123456")

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
            print(f"Superuser created: {email}")
    except Exception as e:
        print(f"Error creating superuser: {e}")
        db.rollback()
    finally:
        db.close()


# Initialize superuser on startup
init_superuser()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Fullstack App API", version="1.0.0", lifespan=lifespan)

# Add security middleware (order matters - add in reverse order of execution)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
# Note: CSRF middleware is commented out for now as it requires frontend changes
# app.add_middleware(CSRFMiddleware)

# Get CORS origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"],  # Expose CSRF token header
)

app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(security.router, prefix="/api/security", tags=["security"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(spc_cd_l1.router, prefix="/api/spc-cd-l1", tags=["spc-cd-l1"])
app.include_router(spc_reg_l1.router, prefix="/api/spc-reg-l1", tags=["spc-reg-l1"])
app.include_router(spc_limits.router, prefix="/api/spc-limits", tags=["spc-limits"])


@app.get("/")
async def root():
    return {"message": "Welcome to the Fullstack App API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
