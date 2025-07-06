import random
import numpy as np
from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, SPCLimits

# Create all tables
Base.metadata.create_all(bind=engine)


def generate_spc_limits():
    """Generate SPC limits data with realistic limit changes over time"""
    db = SessionLocal()

    # Clear existing data
    db.query(SPCLimits).delete()
    db.commit()

    # Parameters
    start_date = datetime.now() - timedelta(days=365 * 2)  # Go back 2 years for history

    # Define the combinations and their allowed ranges - Updated after data cleanup
    # Valid combinations: Process 1000 with BNT44/VLQR1/XLY2, Process 1100 with BNT44 only
    valid_process_product_combos = [
        ("1000", "BNT44"),
        ("1000", "VLQR1"),
        ("1000", "XLY2"),
        ("1100", "BNT44"),
    ]
    
    # Define SPC monitors and their charts
    spc_monitor_configs = {
        "SPC_CD_L1": {
            "charts": ["cd_att", "cd_x_y", "cd_6sig"],
            "limit_ranges": {
                "cd_att": {"cl": (-5, 5), "lcl": (-60, -30), "ucl": (30, 60)},
                "cd_x_y": {"cl": (-2, 2), "lcl": (-10, -6), "ucl": (6, 10)},
                "cd_6sig": {
                    "cl": (10, 30),
                    "lcl": None,  # No LCL for cd_6sig
                    "ucl": (55, 75),
                },
            }
        },
        "SPC_REG_L1": {
            "charts": ["scale_x", "scale_y", "ortho", "centrality_x", "centrality_y", "centrality_rotation"],
            "limit_ranges": {
                "scale_x": {"cl": (6, 10), "lcl": (-1, 1), "ucl": (12, 16)},
                "scale_y": {"cl": (-6, -2), "lcl": (-20, -15), "ucl": (8, 12)},
                "ortho": {"cl": (5, 10), "lcl": (-18, -12), "ucl": (18, 22)},
                "centrality_x": {"cl": (-5, 15), "lcl": (-580, -520), "ucl": (520, 580)},
                "centrality_y": {"cl": (-15, 5), "lcl": (-600, -540), "ucl": (540, 600)},
                "centrality_rotation": {"cl": (-20, -10), "lcl": (-620, -560), "ucl": (460, 520)},
            }
        }
    }

    # Track limit change schedules for each combination
    limit_schedules = {}

    # Initialize schedules for each combination
    for process_type, product_type in valid_process_product_combos:
        for spc_monitor_name, config in spc_monitor_configs.items():
            for chart_name in config["charts"]:
                key = f"{process_type}_{product_type}_{spc_monitor_name}_{chart_name}"

                # Schedule first change randomly in first 3-12 months
                first_change = start_date + timedelta(days=random.uniform(90, 365))

                limit_schedules[key] = {
                    "next_change": first_change,
                    "current_limits": None,
                }

    data_points = []
    current_date = start_date
    end_date = datetime.now()

    # Generate limits over time
    while current_date <= end_date:
        for process_type, product_type in valid_process_product_combos:
            for spc_monitor_name, config in spc_monitor_configs.items():
                for chart_name in config["charts"]:
                    key = f"{process_type}_{product_type}_{spc_monitor_name}_{chart_name}"
                    schedule = limit_schedules[key]

                    # Check if we need to create new limits
                    should_create_limits = (
                        schedule["current_limits"] is None  # First time
                        or current_date >= schedule["next_change"]  # Time for change
                    )

                    if should_create_limits:
                        # Generate new limits based on chart type
                        ranges = config["limit_ranges"][chart_name]

                        # Generate CL as integer
                        cl = random.randint(*ranges["cl"]) if ranges["cl"] else None

                        # Generate LCL as integer
                        lcl = random.randint(*ranges["lcl"]) if ranges["lcl"] else None

                        # Generate UCL as integer
                        ucl = random.randint(*ranges["ucl"]) if ranges["ucl"] else None

                        # Create the limit record
                        limit_record = SPCLimits(
                            process_type=process_type,
                            product_type=product_type,
                            spc_monitor_name=spc_monitor_name,
                            spc_chart_name=chart_name,
                            cl=cl,
                            lcl=lcl,
                            ucl=ucl,
                            effective_date=current_date,
                        )

                        data_points.append(limit_record)

                        # Update schedule
                        schedule["current_limits"] = {"cl": cl, "lcl": lcl, "ucl": ucl}

                        # Schedule next change (3 months to 1 year, average 8 months)
                        days_until_next = np.random.exponential(240)  # 8 months average
                        days_until_next = np.clip(
                            days_until_next, 90, 365
                        )  # 3 months to 1 year
                        schedule["next_change"] = current_date + timedelta(
                            days=days_until_next
                        )

        # Move to next week (check weekly for limit changes)
        current_date += timedelta(weeks=1)

    # Bulk insert all data points
    db.bulk_save_objects(data_points)
    db.commit()

    # Verify the data
    count = db.query(SPCLimits).count()
    print(f"Successfully generated {count} SPC limit records")

    # Show sample data
    sample_data = db.query(SPCLimits).limit(10).all()
    print("\\nSample SPC limits data:")
    for data in sample_data:
        print(
            f"  {data.process_type}/{data.product_type}/{data.spc_chart_name} - "
            f"CL: {data.cl}, LCL: {data.lcl}, UCL: {data.ucl} "
            f"(effective: {data.effective_date.strftime('%Y-%m-%d')})"
        )

    # Show summary by SPC monitor and chart type
    print("\\nSummary by SPC monitor and chart type:")
    for spc_monitor_name, config in spc_monitor_configs.items():
        monitor_count = (
            db.query(SPCLimits).filter(SPCLimits.spc_monitor_name == spc_monitor_name).count()
        )
        print(f"  {spc_monitor_name}: {monitor_count} total records")
        for chart_name in config["charts"]:
            chart_count = (
                db.query(SPCLimits)
                .filter(SPCLimits.spc_monitor_name == spc_monitor_name)
                .filter(SPCLimits.spc_chart_name == chart_name)
                .count()
            )
            print(f"    {chart_name}: {chart_count} records")

    db.close()


if __name__ == "__main__":
    generate_spc_limits()
