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

    # Define the combinations and their allowed ranges
    process_types = ["900", "1000", "1100"]
    product_types = ["XLY1", "XLY2", "BNT44", "VLQR1"]
    spc_monitor_name = "SPC_CD_L1"
    spc_chart_names = ["cd_att", "cd_x_y", "cd_6sig"]

    # Define limit ranges based on chart type
    limit_ranges = {
        "cd_att": {"cl": (-5, 5), "lcl": (-60, -30), "ucl": (30, 60)},
        "cd_x_y": {"cl": (-2, 2), "lcl": (-10, -6), "ucl": (6, 10)},
        "cd_6sig": {
            "cl": (10, 30),
            "lcl": None,  # No LCL for cd_6sig
            "ucl": (55, 75),
        },
    }

    # Track limit change schedules for each combination
    limit_schedules = {}

    # Initialize schedules for each combination
    for process_type in process_types:
        for product_type in product_types:
            for chart_name in spc_chart_names:
                key = f"{process_type}_{product_type}_{chart_name}"

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
        for process_type in process_types:
            for product_type in product_types:
                for chart_name in spc_chart_names:
                    key = f"{process_type}_{product_type}_{chart_name}"
                    schedule = limit_schedules[key]

                    # Check if we need to create new limits
                    should_create_limits = (
                        schedule["current_limits"] is None  # First time
                        or current_date >= schedule["next_change"]  # Time for change
                    )

                    if should_create_limits:
                        # Generate new limits based on chart type
                        ranges = limit_ranges[chart_name]

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

    # Show summary by chart type
    print("\\nSummary by chart type:")
    for chart_name in spc_chart_names:
        chart_count = (
            db.query(SPCLimits).filter(SPCLimits.spc_chart_name == chart_name).count()
        )
        print(f"  {chart_name}: {chart_count} records")

    db.close()


if __name__ == "__main__":
    generate_spc_limits()
