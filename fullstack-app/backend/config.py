"""
Configuration management for both local development and AWS Lambda production.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Detect environment
    is_lambda: bool = bool(os.environ.get("AWS_LAMBDA_ENV"))
    is_production: bool = bool(os.environ.get("AWS_LAMBDA_ENV")) or bool(
        os.environ.get("PRODUCTION")
    )

    # Database configuration
    database_url: str = os.environ.get(
        "DATABASE_URL", "postgresql://appuser:apppassword@postgres:5432/appdb"
    )

    # JWT Configuration
    secret_key: str = os.environ.get("SECRET_KEY", "development-secret-key")
    algorithm: str = os.environ.get("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(
        os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
    )
    refresh_token_expire_days: int = int(
        os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7")
    )

    # Email configuration
    mail_username: str = os.environ.get("MAIL_USERNAME", "")
    mail_password: str = os.environ.get("MAIL_PASSWORD", "")
    mail_from: str = os.environ.get("MAIL_FROM", "noreply@ccdh.me")
    mail_port: int = int(os.environ.get("MAIL_PORT", "587"))
    mail_server: str = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    mail_tls: bool = os.environ.get("MAIL_TLS", "true").lower() == "true"
    mail_ssl: bool = os.environ.get("MAIL_SSL", "false").lower() == "true"

    # Superuser configuration
    superuser_email: str = os.environ.get("SUPERUSER_EMAIL", "admin@ccdh.me")
    superuser_username: str = os.environ.get("SUPERUSER_USERNAME", "admin")
    superuser_password: str = os.environ.get("SUPERUSER_PASSWORD", "admin123456")

    # CORS configuration
    @property
    def cors_origins(self) -> List[str]:
        if self.is_production:
            # Production CORS - will be updated with your domain
            cors_string = os.environ.get("CORS_ORIGINS", "https://yourdomain.com")
            return cors_string.split(",")
        else:
            # Development CORS
            return ["http://localhost:3000", "http://localhost:8000"]

    # Sentry configuration
    sentry_dsn: str = os.environ.get("SENTRY_DSN", "")

    # Lambda specific settings
    @property
    def enable_background_tasks(self) -> bool:
        return not self.is_lambda

    @property
    def temp_directory(self) -> str:
        return "/tmp" if self.is_lambda else "./temp"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


# Create a global settings instance
settings = get_settings()
