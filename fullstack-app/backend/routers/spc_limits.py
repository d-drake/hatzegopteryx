from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import datetime, date
from database import get_db
import models
import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.SPCLimits])
def get_spc_limits(
    process_type: Optional[str] = None,
    product_type: Optional[str] = None,
    spc_monitor_name: Optional[str] = None,
    spc_chart_name: Optional[str] = None,
    effective_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get SPC limits with optional filters. Returns the most recent limit for each combination."""
    query = db.query(models.SPCLimits)
    
    # Apply filters
    filters = []
    if process_type:
        filters.append(models.SPCLimits.process_type == process_type)
    if product_type:
        filters.append(models.SPCLimits.product_type == product_type)
    if spc_monitor_name:
        filters.append(models.SPCLimits.spc_monitor_name == spc_monitor_name)
    if spc_chart_name:
        filters.append(models.SPCLimits.spc_chart_name == spc_chart_name)
    if effective_date:
        filters.append(models.SPCLimits.effective_date <= datetime.combine(effective_date, datetime.max.time()))
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Order by effective_date descending to get most recent limits first
    spc_limits = query.order_by(desc(models.SPCLimits.effective_date)).all()
    return spc_limits

@router.get("/current", response_model=List[schemas.SPCLimits])
def get_current_spc_limits(
    process_type: Optional[str] = None,
    product_type: Optional[str] = None,
    spc_monitor_name: Optional[str] = None,
    spc_chart_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get the current (most recent) SPC limits for each unique combination."""
    # Subquery to get the max effective_date for each combination
    from sqlalchemy import func
    
    subquery = db.query(
        models.SPCLimits.process_type,
        models.SPCLimits.product_type,
        models.SPCLimits.spc_monitor_name,
        models.SPCLimits.spc_chart_name,
        func.max(models.SPCLimits.effective_date).label('max_date')
    ).group_by(
        models.SPCLimits.process_type,
        models.SPCLimits.product_type,
        models.SPCLimits.spc_monitor_name,
        models.SPCLimits.spc_chart_name
    )
    
    # Apply filters to subquery
    if process_type:
        subquery = subquery.filter(models.SPCLimits.process_type == process_type)
    if product_type:
        subquery = subquery.filter(models.SPCLimits.product_type == product_type)
    if spc_monitor_name:
        subquery = subquery.filter(models.SPCLimits.spc_monitor_name == spc_monitor_name)
    if spc_chart_name:
        subquery = subquery.filter(models.SPCLimits.spc_chart_name == spc_chart_name)
    
    subquery = subquery.subquery()
    
    # Join with main table to get full records
    query = db.query(models.SPCLimits).join(
        subquery,
        and_(
            models.SPCLimits.process_type == subquery.c.process_type,
            models.SPCLimits.product_type == subquery.c.product_type,
            models.SPCLimits.spc_monitor_name == subquery.c.spc_monitor_name,
            models.SPCLimits.spc_chart_name == subquery.c.spc_chart_name,
            models.SPCLimits.effective_date == subquery.c.max_date
        )
    )
    
    return query.all()

@router.post("/", response_model=schemas.SPCLimits)
def create_spc_limit(
    spc_limit: schemas.SPCLimitsCreate,
    db: Session = Depends(get_db)
):
    """Create a new SPC limit."""
    # Validate the values based on spc_monitor_name and spc_chart_name
    if spc_limit.spc_monitor_name == "SPC_CD_L1":
        if spc_limit.spc_chart_name == "cd_att":
            if spc_limit.cl is not None and not (-5 <= spc_limit.cl <= 5):
                raise HTTPException(status_code=400, detail="CL must be between -5 and 5 for cd_att")
            if spc_limit.lcl is not None and not (-60 <= spc_limit.lcl <= -30):
                raise HTTPException(status_code=400, detail="LCL must be between -60 and -30 for cd_att")
            if spc_limit.ucl is not None and not (30 <= spc_limit.ucl <= 60):
                raise HTTPException(status_code=400, detail="UCL must be between 30 and 60 for cd_att")
        elif spc_limit.spc_chart_name == "cd_x_y":
            if spc_limit.cl is not None and not (-2 <= spc_limit.cl <= 2):
                raise HTTPException(status_code=400, detail="CL must be between -2 and 2 for cd_x_y")
            if spc_limit.lcl is not None and not (-10 <= spc_limit.lcl <= -6):
                raise HTTPException(status_code=400, detail="LCL must be between -10 and -6 for cd_x_y")
            if spc_limit.ucl is not None and not (6 <= spc_limit.ucl <= 10):
                raise HTTPException(status_code=400, detail="UCL must be between 6 and 10 for cd_x_y")
        elif spc_limit.spc_chart_name == "cd_6sig":
            if spc_limit.cl is not None and not (10 <= spc_limit.cl <= 30):
                raise HTTPException(status_code=400, detail="CL must be between 10 and 30 for cd_6sig")
            if spc_limit.lcl is not None:
                raise HTTPException(status_code=400, detail="LCL must be null for cd_6sig")
            if spc_limit.ucl is not None and not (55 <= spc_limit.ucl <= 75):
                raise HTTPException(status_code=400, detail="UCL must be between 55 and 75 for cd_6sig")
    
    db_spc_limit = models.SPCLimits(**spc_limit.dict())
    db.add(db_spc_limit)
    db.commit()
    db.refresh(db_spc_limit)
    return db_spc_limit

@router.get("/chart-names")
def get_spc_chart_names():
    """Get available SPC chart names."""
    return ["cd_att", "cd_x_y", "cd_6sig"]