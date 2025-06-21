from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, date
from database import get_db
import models
import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.CDData])
def get_cd_data(
    skip: int = 0,
    limit: int = Query(default=100, le=1000),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    entity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.CDData)
    
    # Apply filters
    filters = []
    if start_date:
        filters.append(models.CDData.date_process >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        filters.append(models.CDData.date_process <= datetime.combine(end_date, datetime.max.time()))
    if entity:
        filters.append(models.CDData.entity == entity)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Apply pagination and return
    cd_data = query.offset(skip).limit(limit).all()
    return cd_data

@router.get("/stats")
def get_cd_data_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    entity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.CDData)
    
    # Apply filters
    filters = []
    if start_date:
        filters.append(models.CDData.date_process >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        filters.append(models.CDData.date_process <= datetime.combine(end_date, datetime.max.time()))
    if entity:
        filters.append(models.CDData.entity == entity)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Get statistics
    from sqlalchemy import func
    stats = db.query(
        func.count(models.CDData.lot).label("total_count"),
        func.avg(models.CDData.cd_att).label("avg_cd_att"),
        func.min(models.CDData.cd_att).label("min_cd_att"),
        func.max(models.CDData.cd_att).label("max_cd_att"),
        func.avg(models.CDData.cd_6sig).label("avg_cd_6sig")
    ).filter(and_(*filters) if filters else True).first()
    
    return {
        "total_count": stats.total_count or 0,
        "avg_cd_att": round(stats.avg_cd_att, 2) if stats.avg_cd_att else 0,
        "min_cd_att": round(stats.min_cd_att, 2) if stats.min_cd_att else 0,
        "max_cd_att": round(stats.max_cd_att, 2) if stats.max_cd_att else 0,
        "avg_cd_6sig": round(stats.avg_cd_6sig, 2) if stats.avg_cd_6sig else 0
    }

@router.get("/entities")
def get_entities(db: Session = Depends(get_db)):
    entities = db.query(models.CDData.entity).distinct().all()
    return [entity[0] for entity in entities]