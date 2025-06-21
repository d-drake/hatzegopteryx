from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float
from sqlalchemy.sql import func
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
    entity = Column(String, nullable=False, index=True)  # FAKE_TOOL1-6
    fake_property1 = Column(String, nullable=False)  # FP1_A through FP1_E
    fake_property2 = Column(String, nullable=False)  # FP2_A through FP2_E