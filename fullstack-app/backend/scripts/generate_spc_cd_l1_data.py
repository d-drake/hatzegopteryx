import random
import numpy as np
from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, SPCCdL1
from collections import defaultdict

# Create all tables
Base.metadata.create_all(bind=engine)


def generate_spc_cd_l1_data():
    """Generate 365 days of fake SPC CD L1 data with ~40 points per day"""
    db = SessionLocal()

    # Drop and recreate table to ensure clean schema
    from sqlalchemy import text

    db.execute(text("DROP TABLE IF EXISTS spc_cd_l1 CASCADE"))
    db.commit()

    # Recreate table with current model schema
    Base.metadata.create_all(bind=engine)
    print("Table recreated with latest schema")

    # Parameters
    start_date = datetime.now() - timedelta(days=365)
    total_days = 365
    avg_points_per_day = 120  # Tripled from 40 to 120
    total_points = total_days * avg_points_per_day

    # Generate timestamps - roughly distributed across 365 days
    timestamps = []
    current_time = start_date

    for _ in range(total_points):
        # Add some randomness to time intervals (0.15 to 0.5 hours on average) - reduced for triple data
        hours_increment = random.uniform(0.15, 0.5)
        current_time += timedelta(hours=hours_increment)
        timestamps.append(current_time)

    # Sort timestamps to ensure chronological order
    timestamps.sort()

    # Possible entity values
    entities = [f"FAKE_TOOL{i}" for i in range(1, 7)]

    # Possible bias values (ordinal, non-continuous)
    possible_bias = list(range(-30, 31, 1))  # -30, -29, -28, ..., 29, 30
    possible_bias_x_y = list(range(-15, 16, 1))  # -15, -14, -13, ..., 14, 15

    # New ordinal category values - Updated after data cleanup
    # Valid combinations: Process 1000 with BNT44/VLQR1/XLY2, Process 1100 with BNT44 only
    process_types = ["1000", "1100"]
    product_types = ["BNT44", "VLQR1", "XLY2"]
    # Define valid combinations explicitly
    valid_process_product_combos = [
        ("1000", "BNT44"),
        ("1000", "VLQR1"),
        ("1000", "XLY2"),
        ("1100", "BNT44"),
    ]
    spc_monitor_name = "SPC_CD_L1"  # Only one value for now

    # Duration ranges by process/product type combinations for consistency
    duration_base_values = defaultdict(lambda: np.random.normal(1850, 100))
    for pt, prod in valid_process_product_combos:
        key = f"{pt}_{prod}"
        duration_base_values[key] = np.random.normal(
            1850, 80
        )  # Base value for this combination

    # Initialize bias settings for each combination of entity/spc_monitor_name/product_type/process_type
    bias_settings_by_combo = {}

    # Pre-generate all possible combinations
    for entity in entities:
        for process_type, product_type in valid_process_product_combos:
            combo_key = (entity, spc_monitor_name, product_type, process_type)

            # Initialize with random bias values
            # Average change frequency: once per 2 weeks (14 days)
            next_bias_change = start_date + timedelta(days=random.uniform(10, 18))
            next_bias_x_y_change = start_date + timedelta(days=random.uniform(10, 18))

            bias_settings_by_combo[combo_key] = {
                "current_bias": random.choice(possible_bias),
                "next_bias_change": next_bias_change,
                "current_bias_x_y": random.choice(possible_bias_x_y),
                "next_bias_x_y_change": next_bias_x_y_change,
                "cd_att_noise_factor": 1.0,
                "cd_x_y_noise_factor": 1.0,
            }

    # Generate data points
    data_points = []
    lot_counter = 100000

    for timestamp in timestamps:
        # Select random attributes for this data point
        entity = random.choice(entities)
        # Select from valid process/product combinations only
        process_type, product_type = random.choice(valid_process_product_combos)

        # Get the combination key
        combo_key = (entity, spc_monitor_name, product_type, process_type)
        settings = bias_settings_by_combo[combo_key]

        # Check if bias should change for this combination
        if timestamp >= settings["next_bias_change"]:
            settings["current_bias"] = random.choice(possible_bias)
            # Schedule next change (average 14 days, range 10-18 days)
            days_until_next = np.random.normal(
                14, 2
            )  # Normal distribution with mean 14, std 2
            days_until_next = np.clip(days_until_next, 10, 18)  # Clamp to 10-18 days
            settings["next_bias_change"] = timestamp + timedelta(days=days_until_next)
            # Reduce noise by half when bias changes
            settings["cd_att_noise_factor"] = 0.5
        else:
            # Gradually restore noise factor over time
            settings["cd_att_noise_factor"] = min(
                1.0, settings["cd_att_noise_factor"] + 0.01
            )

        # Check if bias_x_y should change for this combination
        if timestamp >= settings["next_bias_x_y_change"]:
            settings["current_bias_x_y"] = random.choice(possible_bias_x_y)
            # Schedule next change (average 14 days, range 10-18 days)
            days_until_next = np.random.normal(
                14, 2
            )  # Normal distribution with mean 14, std 2
            days_until_next = np.clip(days_until_next, 10, 18)  # Clamp to 10-18 days
            settings["next_bias_x_y_change"] = timestamp + timedelta(
                days=days_until_next
            )
            # Reduce noise by half when bias_x_y changes
            settings["cd_x_y_noise_factor"] = 0.5
        else:
            # Gradually restore noise factor over time
            settings["cd_x_y_noise_factor"] = min(
                1.0, settings["cd_x_y_noise_factor"] + 0.01
            )

        # Get current bias values for this combination
        bias_value = settings["current_bias"]
        bias_x_y_value = settings["current_bias_x_y"]

        # Generate duration for this process/product combination
        duration_key = f"{process_type}_{product_type}"
        base_duration = duration_base_values[duration_key]
        duration_subseq_process_step = np.clip(
            np.random.normal(base_duration, 50), 1500, 2200
        )

        # Generate cd_att with correlation to duration (r ≈ 0.62)
        cd_att_base = bias_value * 2.5  # Scale bias influence

        # Add ultimate correlation between duration and cd_att (target r ≈ 0.62)
        # Positive correlation: longer duration = higher cd_att values
        duration_effect = (
            duration_subseq_process_step - 1850
        ) * 6.0  # Ultimate scale factor to achieve target correlation
        cd_att_base += duration_effect

        noise_std = 20 * settings["cd_att_noise_factor"]
        cd_att_noise = np.random.normal(0, noise_std)  # Adjusted Gaussian noise
        cd_att = np.clip(cd_att_base + cd_att_noise, -100, 100)

        # Generate cd_x_y - loosely proportional to bias_x_y with adjusted noise
        cd_x_y_base = bias_x_y_value * 3.0  # Scale bias_x_y influence
        noise_std = 15 * settings["cd_x_y_noise_factor"]
        cd_x_y_noise = np.random.normal(0, noise_std)  # Adjusted Gaussian noise
        cd_x_y = cd_x_y_base + cd_x_y_noise

        # Generate cd_6sig - centered at 50 with random distribution
        cd_6sig = np.random.normal(50, 10)  # Mean=50, StdDev=10
        cd_6sig = max(0, cd_6sig)  # Ensure non-negative

        # Generate fake_property1 (ordinal string values) - correlate with cd_att
        if cd_att > 50:
            fake_property1 = random.choice(["FP1_D", "FP1_E"])
        elif cd_att > 0:
            fake_property1 = random.choice(["FP1_B", "FP1_C", "FP1_D"])
        else:
            fake_property1 = random.choice(["FP1_A", "FP1_B"])

        # Generate fake_property2 (ordinal string values) - inverse correlation with cd_att
        if cd_att < -50:
            fake_property2 = random.choice(["FP2_D", "FP2_E"])
        elif cd_att < 0:
            fake_property2 = random.choice(["FP2_B", "FP2_C", "FP2_D"])
        else:
            fake_property2 = random.choice(["FP2_A", "FP2_B"])

        # Create data point with lot ID
        lot_id = f"Lot{lot_counter}"
        data_point = SPCCdL1(
            lot=lot_id,
            date_process=timestamp,
            bias=bias_value,
            bias_x_y=bias_x_y_value,
            cd_att=round(float(cd_att), 2),
            cd_x_y=round(float(cd_x_y), 2),
            cd_6sig=round(float(cd_6sig), 2),
            duration_subseq_process_step=round(float(duration_subseq_process_step), 1),
            entity=entity,
            fake_property1=fake_property1,
            fake_property2=fake_property2,
            process_type=process_type,
            product_type=product_type,
            spc_monitor_name=spc_monitor_name,
        )
        data_points.append(data_point)
        lot_counter += 1

    # Bulk insert all data points
    db.bulk_save_objects(data_points)
    db.commit()

    # Verify the data
    count = db.query(SPCCdL1).count()
    print(f"Successfully generated {count} SPC CD L1 data points")

    # Show sample data
    sample_data = db.query(SPCCdL1).limit(5).all()
    print("\nSample data:")
    for data in sample_data:
        print(
            f"  {data.lot} - {data.date_process.strftime('%Y-%m-%d %H:%M:%S')} - "
            f"bias: {data.bias}, cd_att: {data.cd_att}, "
            f"entity: {data.entity}, fp1: {data.fake_property1}, fp2: {data.fake_property2}"
        )

    db.close()


if __name__ == "__main__":
    generate_spc_cd_l1_data()
