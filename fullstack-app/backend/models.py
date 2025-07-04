from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Float,
    Index,
    ForeignKey,
    JSON,
    Text,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import INET
from database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CDData(Base):
    __tablename__ = "cd_data"

    lot = Column(String, primary_key=True, index=True)  # Lot100000, Lot100001, etc.
    date_process = Column(DateTime, nullable=False, index=True)
    bias = Column(Integer, nullable=False)  # -30 to 30 nm
    bias_x_y = Column(Integer, nullable=False)  # -15 to 15 nm
    cd_att = Column(Float, nullable=False)  # ~-100 to 100 nm
    cd_x_y = Column(Float, nullable=False)  # centered at 0
    cd_6sig = Column(Float, nullable=False)  # centered at 50 nm
    duration_subseq_process_step = Column(
        Float, nullable=False
    )  # Duration in seconds (1500-2200s)
    entity = Column(String, nullable=False, index=True)  # FAKE_TOOL1-6
    fake_property1 = Column(String, nullable=False)  # FP1_A through FP1_E
    fake_property2 = Column(String, nullable=False)  # FP2_A through FP2_E
    process_type = Column(String, nullable=False, index=True)  # 900, 1000, 1100
    product_type = Column(
        String, nullable=False, index=True
    )  # XLY1, XLY2, BNT44, VLQR1
    spc_monitor_name = Column(String, nullable=False, index=True)  # SPC_CD_L1


class SPCLimits(Base):
    __tablename__ = "spc_limits"

    id = Column(Integer, primary_key=True, index=True)
    process_type = Column(String, nullable=False, index=True)  # 900, 1000, 1100
    product_type = Column(
        String, nullable=False, index=True
    )  # XLY1, XLY2, BNT44, VLQR1
    spc_monitor_name = Column(String, nullable=False, index=True)  # SPC_CD_L1
    spc_chart_name = Column(
        String, nullable=False, index=True
    )  # cd_att, cd_x_y, cd_6sig
    cl = Column(Integer, nullable=True)  # Center Line
    lcl = Column(Integer, nullable=True)  # Lower Control Limit
    ucl = Column(Integer, nullable=True)  # Upper Control Limit
    effective_date = Column(
        DateTime, nullable=False, default=func.now()
    )  # When this limit becomes effective

    # Create composite index for efficient querying
    __table_args__ = (
        Index(
            "idx_spc_limits_composite",
            "process_type",
            "product_type",
            "spc_monitor_name",
            "spc_chart_name",
            "effective_date",
        ),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs = relationship("AuditLog", back_populates="user")
    approved_registrations = relationship(
        "RegistrationRequest",
        back_populates="approved_by_user",
        foreign_keys="RegistrationRequest.approved_by",
    )


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    approved = Column(Boolean, default=None)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    approved_by_user = relationship(
        "User", back_populates="approved_registrations", foreign_keys=[approved_by]
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(255), nullable=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    success = Column(Boolean, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    # Create composite index for efficient querying
    __table_args__ = (
        Index("idx_audit_logs_user_action", "user_id", "action", "created_at"),
    )


class BlacklistedToken(Base):
    __tablename__ = "blacklisted_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID
    token_type = Column(String(50), nullable=False)  # 'access' or 'refresh'
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(
        DateTime(timezone=True), nullable=False
    )  # When the token would have expired naturally
    reason = Column(String(255), nullable=True)  # logout, revoked, etc.
