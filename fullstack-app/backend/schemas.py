from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any


# Item schemas
class ItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None


class Item(ItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserInDB(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserInDB):
    pass


# Authentication schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegistrationRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)


class RegistrationResponse(BaseModel):
    id: int
    email: str
    username: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class RegistrationApproval(BaseModel):
    token: str
    approved: bool


# Audit log schemas
class AuditLogBase(BaseModel):
    action: str
    resource: Optional[str] = None
    success: bool
    details: Optional[Dict[str, Any]] = None


class AuditLogResponse(AuditLogBase):
    id: int
    user_id: Optional[int]
    user: Optional[dict] = None  # {"username": str, "email": str}
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Password change schema
class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


# Email schemas for notifications
class EmailSchema(BaseModel):
    email: EmailStr
    subject: str
    body: str


# CD Data schemas
class CDDataBase(BaseModel):
    lot: str
    date_process: datetime
    bias: int
    bias_x_y: int
    cd_att: float
    cd_x_y: float
    cd_6sig: float
    duration_subseq_process_step: float
    entity: str
    fake_property1: str
    fake_property2: str
    process_type: str
    product_type: str
    spc_monitor_name: str


class CDData(CDDataBase):
    model_config = ConfigDict(from_attributes=True)


# SPC Limits schemas
class SPCLimitsBase(BaseModel):
    process_type: str
    product_type: str
    spc_monitor_name: str
    spc_chart_name: str
    cl: Optional[int] = None
    lcl: Optional[int] = None
    ucl: Optional[int] = None
    effective_date: datetime


class SPCLimitsCreate(SPCLimitsBase):
    pass


class SPCLimitsUpdate(BaseModel):
    cl: Optional[int] = None
    lcl: Optional[int] = None
    ucl: Optional[int] = None


class SPCLimits(SPCLimitsBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# Data Statistics
class DataStatistics(BaseModel):
    count: int
    min_value: Optional[float]
    max_value: Optional[float]
    avg_value: Optional[float]
    std_dev: Optional[float]

    model_config = ConfigDict(from_attributes=True)
