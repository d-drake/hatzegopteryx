from fastapi import Depends, HTTPException, status
from typing import List, Optional
from models import User
from auth import get_current_user

class RoleChecker:
    """
    A dependency class to check if a user has the required role(s).
    """
    def __init__(self, allowed_roles: Optional[List[str]] = None):
        self.allowed_roles = allowed_roles or []

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        
        # For now, we only have superuser role
        # This can be extended to support more granular roles
        if self.allowed_roles:
            if "superuser" in self.allowed_roles and not user.is_superuser:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
        
        return user

# Pre-defined permission dependencies
require_active_user = RoleChecker()
require_superuser = RoleChecker(allowed_roles=["superuser"])