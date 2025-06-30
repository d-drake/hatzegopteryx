from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import secrets
import time

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy - adjust based on your needs
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "  # Added CDN for Swagger UI
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "  # Added CDN for Swagger UI
            "img-src 'self' data: https:; "
            "font-src 'self' https://cdn.jsdelivr.net; "  # Added CDN for fonts
            "connect-src 'self' http://localhost:* ws://localhost:*; "  # For dev
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware.
    For state-changing operations, requires a CSRF token in the header.
    """
    
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    CSRF_HEADER = "X-CSRF-Token"
    CSRF_COOKIE = "csrf_token"
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF check for safe methods
        if request.method in self.SAFE_METHODS:
            response = await call_next(request)
            # Set CSRF token cookie for GET requests
            if request.method == "GET" and not request.cookies.get(self.CSRF_COOKIE):
                csrf_token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key=self.CSRF_COOKIE,
                    value=csrf_token,
                    httponly=True,
                    samesite="strict",
                    secure=False,  # Set to True in production with HTTPS
                    max_age=3600 * 24  # 24 hours
                )
            return response
        
        # Skip CSRF for authentication endpoints (they use their own tokens)
        if request.url.path.startswith("/api/auth/"):
            return await call_next(request)
        
        # Check CSRF token for state-changing requests
        cookie_token = request.cookies.get(self.CSRF_COOKIE)
        header_token = request.headers.get(self.CSRF_HEADER)
        
        if not cookie_token or not header_token or cookie_token != header_token:
            return Response(
                content="CSRF validation failed",
                status_code=403,
                headers={"Content-Type": "text/plain"}
            )
        
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware.
    In production, consider using a more sophisticated solution with Redis.
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = {}  # IP -> [(timestamp, ...)]
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get client IP
        client_ip = request.client.host
        if "X-Forwarded-For" in request.headers:
            client_ip = request.headers["X-Forwarded-For"].split(",")[0].strip()
        
        # Clean old requests
        current_time = time.time()
        if client_ip in self.requests:
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if current_time - req_time < 60
            ]
        
        # Check rate limit
        if client_ip in self.requests:
            if len(self.requests[client_ip]) >= self.requests_per_minute:
                return Response(
                    content="Rate limit exceeded. Please try again later.",
                    status_code=429,
                    headers={
                        "Content-Type": "text/plain",
                        "Retry-After": "60"
                    }
                )
        
        # Record request
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        self.requests[client_ip].append(current_time)
        
        # Special rate limits for sensitive endpoints
        if request.url.path == "/api/auth/login":
            # Stricter limit for login attempts (10 per minute)
            login_requests = [
                req for req in self.requests.get(f"{client_ip}:login", [])
                if current_time - req < 60
            ]
            if len(login_requests) >= 10:
                return Response(
                    content="Too many login attempts. Please try again later.",
                    status_code=429,
                    headers={
                        "Content-Type": "text/plain",
                        "Retry-After": "300"  # 5 minutes
                    }
                )
            if f"{client_ip}:login" not in self.requests:
                self.requests[f"{client_ip}:login"] = []
            self.requests[f"{client_ip}:login"].append(current_time)
        
        return await call_next(request)