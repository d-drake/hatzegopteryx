from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

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
    
    class Config:
        from_attributes = True

class CDDataBase(BaseModel):
    date_process: datetime
    bias: int
    bias_x_y: int
    cd_att: float
    cd_x_y: float
    cd_6sig: float
    entity: str
    fake_property1: str
    fake_property2: str

class CDDataCreate(CDDataBase):
    lot: str

class CDData(CDDataBase):
    lot: str
    
    class Config:
        from_attributes = True