import random
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, CDData

# Create all tables
Base.metadata.create_all(bind=engine)

def generate_cd_data():
    """Generate 365 days of fake CD data with ~40 points per day"""
    db = SessionLocal()
    
    # Clear existing data
    db.query(CDData).delete()
    db.commit()
    
    # Parameters
    start_date = datetime.now() - timedelta(days=365)
    total_days = 365
    avg_points_per_day = 40
    total_points = total_days * avg_points_per_day
    
    # Generate timestamps - roughly distributed across 365 days
    timestamps = []
    current_time = start_date
    
    for _ in range(total_points):
        # Add some randomness to time intervals (0.5 to 1.5 hours on average)
        hours_increment = random.uniform(0.5, 1.5)
        current_time += timedelta(hours=hours_increment)
        timestamps.append(current_time)
    
    # Possible entity values
    entities = [f"FAKE_TOOL{i}" for i in range(1, 7)]
    
    # Possible bias values (ordinal, non-continuous)
    bias = list(range(-30, 31, 1))  # -30, -29, -28, ..., 29, 30
    bias_x_y = list(range(-15, 16, 1))  # -15, -14, -13, ..., 14, 15
    
    # Generate data points
    data_points = []
    
    for timestamp in timestamps:
        # Select ordinal values
        bias_value = random.choice(bias)
        bias_x_y_value = random.choice(bias_x_y)
        
        # Generate cd_att - loosely proportional to bias
        # Base value influenced by bias, plus random noise
        cd_att_base = bias_value * 2.5  # Scale bias influence
        cd_att_noise = np.random.normal(0, 20)  # Add Gaussian noise
        cd_att = np.clip(cd_att_base + cd_att_noise, -100, 100)
        
        # Generate cd_x_y - loosely proportional to bias_x_y
        cd_x_y_base = bias_x_y_value * 3.0  # Scale bias_x_y influence
        cd_x_y_noise = np.random.normal(0, 15)  # Add Gaussian noise
        cd_x_y = cd_x_y_base + cd_x_y_noise
        
        # Generate cd_6sig - centered at 50 with random distribution
        cd_6sig = np.random.normal(50, 10)  # Mean=50, StdDev=10
        cd_6sig = max(0, cd_6sig)  # Ensure non-negative
        
        # Select entity
        entity = random.choice(entities)
        
        # Generate fake_property1 (0-100) - higher values correlate with higher cd_att
        # Use cd_att to influence the distribution
        if cd_att > 50:
            fake_property1 = random.randint(60, 100)
        elif cd_att > 0:
            fake_property1 = random.randint(30, 70)
        else:
            fake_property1 = random.randint(0, 40)
        
        # Generate fake_property2 (0-200) - higher values correlate with lower cd_att
        # Inverse relationship with cd_att
        if cd_att < -50:
            fake_property2 = random.randint(150, 200)
        elif cd_att < 0:
            fake_property2 = random.randint(100, 150)
        else:
            fake_property2 = random.randint(0, 100)
        
        # Create data point
        data_point = CDData(
            datetime=timestamp,
            bias=bias_value,
            bias_x_y=bias_x_y_value,
            cd_att=round(float(cd_att), 2),
            cd_x_y=round(float(cd_x_y), 2),
            cd_6sig=round(float(cd_6sig), 2),
            entity=entity,
            fake_property1=fake_property1,
            fake_property2=fake_property2
        )
        data_points.append(data_point)
    
    # Bulk insert all data points
    db.bulk_save_objects(data_points)
    db.commit()
    
    # Verify the data
    count = db.query(CDData).count()
    print(f"Successfully generated {count} CD data points")
    
    # Show sample data
    sample_data = db.query(CDData).limit(5).all()
    print("\nSample data:")
    for data in sample_data:
        print(f"  {data.datetime.strftime('%Y-%m-%d %H:%M:%S')} - "
              f"bias: {data.bias}, cd_att: {data.cd_att}, "
              f"entity: {data.entity}, fp1: {data.fake_property1}, fp2: {data.fake_property2}")
    
    db.close()

if __name__ == "__main__":
    generate_cd_data()