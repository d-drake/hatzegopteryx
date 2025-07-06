from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from database import get_db
from auth import get_current_user_optional
import models
import schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.SPCRegL1])
async def get_spc_reg_l1_data(
    skip: int = 0,
    limit: int = Query(default=100, le=1000),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    entity: Optional[str] = None,
    process_type: Optional[str] = None,
    product_type: Optional[str] = None,
    spc_monitor_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    # For unauthenticated users (guests), enforce 30-day limit
    if not current_user:
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        # Override dates for guests
        if not start_date or start_date < thirty_days_ago:
            start_date = thirty_days_ago
        if not end_date or end_date > today:
            end_date = today

        # Validate guest date range
        if start_date < thirty_days_ago or end_date > today:
            raise HTTPException(
                status_code=403,
                detail="Guest access is limited to the past 30 days of data",
            )

    query = db.query(models.SPCRegL1)

    # Apply filters
    filters = []
    if start_date:
        filters.append(
            models.SPCRegL1.date_process
            >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        filters.append(
            models.SPCRegL1.date_process
            <= datetime.combine(end_date, datetime.max.time())
        )
    if entity:
        filters.append(models.SPCRegL1.entity == entity)
    if process_type:
        filters.append(models.SPCRegL1.process_type == process_type)
    if product_type:
        filters.append(models.SPCRegL1.product_type == product_type)
    if spc_monitor_name:
        filters.append(models.SPCRegL1.spc_monitor_name == spc_monitor_name)

    if filters:
        query = query.filter(and_(*filters))

    # Sort by date_process descending (newest first)
    query = query.order_by(models.SPCRegL1.date_process.desc())

    # Apply pagination and return
    spc_reg_l1_data = query.offset(skip).limit(limit).all()
    return spc_reg_l1_data


@router.get("/stats")
async def get_spc_reg_l1_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    entity: Optional[str] = None,
    process_type: Optional[str] = None,
    product_type: Optional[str] = None,
    spc_monitor_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    # For unauthenticated users (guests), enforce 30-day limit
    if not current_user:
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        # Override dates for guests
        if not start_date or start_date < thirty_days_ago:
            start_date = thirty_days_ago
        if not end_date or end_date > today:
            end_date = today

        # Validate guest date range
        if start_date < thirty_days_ago or end_date > today:
            raise HTTPException(
                status_code=403,
                detail="Guest access is limited to the past 30 days of data",
            )

    query = db.query(models.SPCRegL1)

    # Apply filters
    filters = []
    if start_date:
        filters.append(
            models.SPCRegL1.date_process
            >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        filters.append(
            models.SPCRegL1.date_process
            <= datetime.combine(end_date, datetime.max.time())
        )
    if entity:
        filters.append(models.SPCRegL1.entity == entity)
    if process_type:
        filters.append(models.SPCRegL1.process_type == process_type)
    if product_type:
        filters.append(models.SPCRegL1.product_type == product_type)
    if spc_monitor_name:
        filters.append(models.SPCRegL1.spc_monitor_name == spc_monitor_name)

    if filters:
        query = query.filter(and_(*filters))

    # Get statistics
    from sqlalchemy import func

    query = db.query(
        func.count(models.SPCRegL1.lot).label("total_count"),
        func.avg(models.SPCRegL1.scale_x).label("avg_scale_x"),
        func.min(models.SPCRegL1.scale_x).label("min_scale_x"),
        func.max(models.SPCRegL1.scale_x).label("max_scale_x"),
        func.avg(models.SPCRegL1.scale_y).label("avg_scale_y"),
        func.avg(models.SPCRegL1.ortho).label("avg_ortho"),
        func.avg(models.SPCRegL1.centrality_x).label("avg_centrality_x"),
        func.avg(models.SPCRegL1.centrality_y).label("avg_centrality_y"),
        func.avg(models.SPCRegL1.centrality_rotation).label("avg_centrality_rotation"),
    )

    if filters:
        query = query.filter(and_(*filters))

    stats = query.first()

    if not stats:
        return {
            "total_count": 0,
            "avg_scale_x": 0,
            "min_scale_x": 0,
            "max_scale_x": 0,
            "avg_scale_y": 0,
            "avg_ortho": 0,
            "avg_centrality_x": 0,
            "avg_centrality_y": 0,
            "avg_centrality_rotation": 0,
        }

    return {
        "total_count": stats.total_count or 0,
        "avg_scale_x": round(stats.avg_scale_x, 6) if stats.avg_scale_x is not None else 0,
        "min_scale_x": round(stats.min_scale_x, 6) if stats.min_scale_x is not None else 0,
        "max_scale_x": round(stats.max_scale_x, 6) if stats.max_scale_x is not None else 0,
        "avg_scale_y": round(stats.avg_scale_y, 6) if stats.avg_scale_y is not None else 0,
        "avg_ortho": round(stats.avg_ortho, 6) if stats.avg_ortho is not None else 0,
        "avg_centrality_x": round(stats.avg_centrality_x, 2) if stats.avg_centrality_x is not None else 0,
        "avg_centrality_y": round(stats.avg_centrality_y, 2) if stats.avg_centrality_y is not None else 0,
        "avg_centrality_rotation": round(stats.avg_centrality_rotation, 6) if stats.avg_centrality_rotation is not None else 0,
    }




@router.get("/entities")
def get_entities(db: Session = Depends(get_db)):
    entities = db.query(models.SPCRegL1.entity).distinct().all()
    return [entity[0] for entity in entities]


@router.get("/process-types")
def get_process_types(db: Session = Depends(get_db)):
    process_types = db.query(models.SPCRegL1.process_type).distinct().all()
    return [pt[0] for pt in process_types]


@router.get("/product-types")
def get_product_types(db: Session = Depends(get_db)):
    product_types = db.query(models.SPCRegL1.product_type).distinct().all()
    return [pt[0] for pt in product_types]


@router.get("/spc-monitor-names")
def get_spc_monitor_names(db: Session = Depends(get_db)):
    spc_monitor_names = db.query(models.SPCRegL1.spc_monitor_name).distinct().all()
    return [smn[0] for smn in spc_monitor_names]


@router.get("/process-product-combinations")
def get_process_product_combinations(db: Session = Depends(get_db)):
    """Get unique combinations of process_type and product_type, sorted."""
    combinations = (
        db.query(models.SPCRegL1.process_type, models.SPCRegL1.product_type)
        .distinct()
        .all()
    )

    # Sort combinations by process_type first (as integers), then product_type alphabetically
    sorted_combinations = sorted(combinations, key=lambda x: (int(x[0]), x[1]))

    return [
        {"process_type": pt, "product_type": pdt} for pt, pdt in sorted_combinations
    ]


@router.get("/spc-limits", response_model=List[schemas.SPCLimits])
def get_spc_limits(
    process_type: Optional[str] = None,
    product_type: Optional[str] = None,
    spc_monitor_name: Optional[str] = None,
    spc_chart_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get SPC limits filtered by parameters."""
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

    if filters:
        query = query.filter(and_(*filters))

    # Order by effective_date to get chronological limits
    spc_limits = query.order_by(models.SPCLimits.effective_date).all()
    return spc_limits