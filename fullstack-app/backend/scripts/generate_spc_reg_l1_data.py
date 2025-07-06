import random
import numpy as np
from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, SPCRegL1
from collections import defaultdict

# Create all tables
Base.metadata.create_all(bind=engine)


def apply_soft_boundary(value, target_min, target_max, containment_ratio=0.95):
    """
    Apply soft boundaries - keep containment_ratio% within range, allow controlled excursions beyond.
    This prevents artificial flatlining at boundaries while keeping most data within target range.
    """
    target_range = target_max - target_min
    
    # Allow small excursions beyond boundaries for realistic variation
    if value < target_min:
        excess = target_min - value
        # Use tanh for smooth falloff - allows some excursion with diminishing returns
        max_excursion = target_range * (1 - containment_ratio)
        if excess <= max_excursion:
            return value  # Allow small excursions
        else:
            # Soft limit for larger excursions
            return target_min - max_excursion * np.tanh(excess / max_excursion)
    elif value > target_max:
        excess = value - target_max
        max_excursion = target_range * (1 - containment_ratio)
        if excess <= max_excursion:
            return value  # Allow small excursions
        else:
            # Soft limit for larger excursions  
            return target_max + max_excursion * np.tanh(excess / max_excursion)
    
    return value  # Most values pass through unchanged


def generate_spc_reg_l1_data():
    """Generate 365 days of fake SPC REG L1 data with ~40 points per day to match SPC CD L1"""
    db = SessionLocal()

    # Drop and recreate table to ensure clean schema
    from sqlalchemy import text

    db.execute(text("DROP TABLE IF EXISTS spc_reg_l1 CASCADE"))
    db.commit()

    # Recreate table with current model schema
    Base.metadata.create_all(bind=engine)
    print("Table recreated with latest schema")

    # Parameters - match SPC CD L1 record count (~14,586)
    start_date = datetime.now() - timedelta(days=365)
    total_days = 365
    avg_points_per_day = 40  # Reduced from 120 to match SPC CD L1 data volume
    total_points = total_days * avg_points_per_day

    # Generate timestamps - roughly distributed across 365 days
    timestamps = []
    current_time = start_date

    for _ in range(total_points):
        # Add some randomness to time intervals (0.45 to 1.5 hours on average for fewer points)
        hours_increment = random.uniform(0.45, 1.5)
        current_time += timedelta(hours=hours_increment)
        timestamps.append(current_time)

    # Sort timestamps to ensure chronological order
    timestamps.sort()

    # Possible entity values - match SPC CD L1 entities
    entities = [f"FAKE_TOOL{i}" for i in range(1, 7)]

    # Process/Product combinations - match SPC CD L1 combinations
    valid_process_product_combos = [
        ("1000", "BNT44"),
        ("1000", "VLQR1"),
        ("1000", "XLY2"),
        ("1100", "BNT44"),
    ]
    spc_monitor_name = "SPC_REG_L1"

    # Fake property values for registration measurements
    fake_property1_values = ["FP1_A", "FP1_B", "FP1_C", "FP1_D", "FP1_E"]
    fake_property2_values = ["FP2_A", "FP2_B", "FP2_C", "FP2_D", "FP2_E"]

    # Recipe correlation base values by process/product combination
    # Create ordinal value set for recipe fields: [-0.30, -0.29, -0.28, ..., 0.28, 0.29, 0.30]
    ordinal_recipe_values = [round(x, 2) for x in np.arange(-0.30, 0.31, 0.01)]
    
    recipe_base_values = defaultdict(dict)
    for pt, prod in valid_process_product_combos:
        key = f"{pt}_{prod}"
        recipe_base_values[key] = {
            "scale_x": random.choice(ordinal_recipe_values),  # Ordinal from -0.30 to 0.30
            "scale_y": random.choice(ordinal_recipe_values),  # Ordinal from -0.30 to 0.30
            "ortho": random.choice(ordinal_recipe_values),    # Ordinal from -0.30 to 0.30
        }

    # Initialize drift settings for each combination of entity/process/product
    drift_settings_by_combo = {}

    # Pre-generate all possible combinations
    for entity in entities:
        for process_type, product_type in valid_process_product_combos:
            combo_key = (entity, spc_monitor_name, product_type, process_type)
            
            # Get recipe base values for this process/product combination
            recipe_key = f"{process_type}_{product_type}"
            recipe_values = recipe_base_values[recipe_key]

            # Initialize drift parameters for this combination
            # Average drift change frequency: once per 2-3 weeks
            next_drift_change = start_date + timedelta(days=random.uniform(14, 21))

            drift_settings_by_combo[combo_key] = {
                "recipe_scale_x": recipe_values["scale_x"],
                "recipe_scale_y": recipe_values["scale_y"],
                "recipe_ortho": recipe_values["ortho"],
                "drift_scale_x": 0.0,  # Current drift offset
                "drift_scale_y": 0.0,
                "drift_ortho": 0.0,
                "next_drift_change": next_drift_change,
                "noise_factor": 1.0,
            }

    # Generate data points
    data_points = []
    lot_counter = 200000  # Different starting number to distinguish from CD data

    for timestamp in timestamps:
        # Select random attributes for this data point
        entity = random.choice(entities)
        # Select from valid process/product combinations only
        process_type, product_type = random.choice(valid_process_product_combos)

        # Get the combination key
        combo_key = (entity, spc_monitor_name, product_type, process_type)
        settings = drift_settings_by_combo[combo_key]

        # Check if drift should change for this combination
        if timestamp >= settings["next_drift_change"]:
            # Apply gradual drift changes
            settings["drift_scale_x"] += np.random.normal(0, 0.01)
            settings["drift_scale_y"] += np.random.normal(0, 0.02)
            settings["drift_ortho"] += np.random.normal(0, 0.015)
            
            # Schedule next change (average 17 days, range 14-21 days)
            days_until_next = np.random.normal(17, 2)
            days_until_next = np.clip(days_until_next, 14, 21)
            settings["next_drift_change"] = timestamp + timedelta(days=days_until_next)
            
            # Reset noise factor after drift change
            settings["noise_factor"] = 0.7

        else:
            # Gradually restore noise factor over time
            settings["noise_factor"] = min(1.0, settings["noise_factor"] + 0.008)

        # Generate recipe correlation values with drift (maintain ordinal nature)
        # Apply drift but keep values ordinal within -0.30 to 0.30 range
        recipe_scale_x_drift = settings["recipe_scale_x"] + settings["drift_scale_x"]
        recipe_scale_x = max(-0.30, min(0.30, round(recipe_scale_x_drift, 2)))
        
        recipe_scale_y_drift = settings["recipe_scale_y"] + settings["drift_scale_y"]
        recipe_scale_y = max(-0.30, min(0.30, round(recipe_scale_y_drift, 2)))
        
        recipe_ortho_drift = settings["recipe_ortho"] + settings["drift_ortho"]
        recipe_ortho = max(-0.30, min(0.30, round(recipe_ortho_drift, 2)))

        # Generate primary registration measurements with recipe correlation
        # Scale X measurement (reduced correlation to prevent boundary flatlining)
        scale_x_base = recipe_scale_x * 0.4  # 40% correlation with recipe (reduced from 80%)
        scale_x_noise = np.random.normal(0, 0.04 * settings["noise_factor"])  # Increased noise
        scale_x_raw = scale_x_base + scale_x_noise
        scale_x = apply_soft_boundary(scale_x_raw, -0.150, 0.150, containment_ratio=0.95)

        # Scale Y measurement (reduced correlation to prevent boundary flatlining)
        scale_y_base = recipe_scale_y * 0.4  # 40% correlation with recipe (reduced from 75%)
        scale_y_noise = np.random.normal(0, 0.045 * settings["noise_factor"])  # Increased noise
        scale_y_raw = scale_y_base + scale_y_noise
        scale_y = apply_soft_boundary(scale_y_raw, -0.150, 0.150, containment_ratio=0.95)

        # Ortho measurement (reduced correlation to prevent boundary flatlining)
        ortho_base = recipe_ortho * 0.4  # 40% correlation with recipe (reduced from 85%)
        ortho_noise = np.random.normal(0, 0.042 * settings["noise_factor"])  # Increased noise
        ortho_raw = ortho_base + ortho_noise
        ortho = apply_soft_boundary(ortho_raw, -0.150, 0.150, containment_ratio=0.95)

        # Generate centrality measurements (less correlated with recipe)
        # Centrality X - broader range, entity-dependent
        entity_offset_x = (int(entity[-1]) - 3.5) * 50  # Entity-based offset
        centrality_x = np.random.normal(entity_offset_x, 200)
        centrality_x = np.clip(centrality_x, -800, 800)

        # Centrality Y - broader range, entity-dependent
        entity_offset_y = (int(entity[-1]) - 3.5) * 45  # Entity-based offset
        centrality_y = np.random.normal(entity_offset_y, 190)
        centrality_y = np.clip(centrality_y, -800, 800)

        # Centrality Rotation - broader range, loosely correlated with X/Y
        rotation_base = (centrality_x + centrality_y) * 0.1  # Weak correlation
        centrality_rotation = np.random.normal(rotation_base, 210)
        centrality_rotation = np.clip(centrality_rotation, -800, 800)

        # Generate fake properties based on measurements
        # Fake_property1 - correlated with scale_x
        if scale_x > 0.08:
            fake_property1 = random.choice(["FP1_D", "FP1_E"])
        elif scale_x > 0.04:
            fake_property1 = random.choice(["FP1_B", "FP1_C", "FP1_D"])
        else:
            fake_property1 = random.choice(["FP1_A", "FP1_B"])

        # Fake_property2 - correlated with ortho
        if ortho > 0.1:
            fake_property2 = random.choice(["FP2_D", "FP2_E"])
        elif ortho > 0:
            fake_property2 = random.choice(["FP2_B", "FP2_C", "FP2_D"])
        else:
            fake_property2 = random.choice(["FP2_A", "FP2_B"])

        # Create data point with lot ID
        lot_id = f"Lot{lot_counter}"
        data_point = SPCRegL1(
            lot=lot_id,
            date_process=timestamp,
            process_type=process_type,
            product_type=product_type,
            spc_monitor_name=spc_monitor_name,
            entity=entity,
            fake_property1=fake_property1,
            fake_property2=fake_property2,
            recipe_scale_x=round(float(recipe_scale_x), 2),
            recipe_scale_y=round(float(recipe_scale_y), 2),
            recipe_ortho=round(float(recipe_ortho), 2),
            scale_x=round(float(scale_x), 3),
            scale_y=round(float(scale_y), 3),
            ortho=round(float(ortho), 3),
            centrality_x=round(float(centrality_x), 2),
            centrality_y=round(float(centrality_y), 2),
            centrality_rotation=round(float(centrality_rotation), 2),
        )
        data_points.append(data_point)
        lot_counter += 1

    # Bulk insert all data points
    db.bulk_save_objects(data_points)
    db.commit()

    # Verify the data
    count = db.query(SPCRegL1).count()
    print(f"Successfully generated {count} SPC REG L1 data points")

    # Show sample data
    sample_data = db.query(SPCRegL1).limit(5).all()
    print("\nSample data:")
    for data in sample_data:
        print(
            f"  {data.lot} - {data.date_process.strftime('%Y-%m-%d %H:%M:%S')} - "
            f"scale_x: {data.scale_x}, scale_y: {data.scale_y}, ortho: {data.ortho}, "
            f"entity: {data.entity}, fp1: {data.fake_property1}, fp2: {data.fake_property2}"
        )

    db.close()


if __name__ == "__main__":
    generate_spc_reg_l1_data()