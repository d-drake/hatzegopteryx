#!/usr/bin/env python3
"""
Data verification and seeding script for the backend database.
Checks if cd_data and spc_limits tables have data, and generates it if missing.
"""

import os
import sys
import subprocess
from database import SessionLocal, engine
from models import Base, CDData, SPCLimits


def check_table_data(db, model_class):
    """Check if a table has any data."""
    try:
        count = db.query(model_class).count()
        return count > 0
    except Exception as e:
        print(f"Error checking {model_class.__name__} table: {e}")
        return False


def run_generation_script(script_name):
    """Run a data generation script."""
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    
    if not os.path.exists(script_path):
        print(f"Error: Script {script_path} not found!")
        return False
    
    try:
        print(f"Running {script_name}...")
        # Run using module syntax from the parent directory (/app) so imports work correctly
        app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        module_name = f"scripts.{script_name[:-3]}"  # Remove .py extension
        result = subprocess.run([sys.executable, "-m", module_name], 
                              capture_output=True, text=True, cwd=app_dir)
        
        if result.returncode == 0:
            print(f"✓ {script_name} completed successfully")
            if result.stdout:
                print(result.stdout)
            return True
        else:
            print(f"✗ {script_name} failed with return code {result.returncode}")
            if result.stderr:
                print(f"Error: {result.stderr}")
            if result.stdout:
                print(f"Output: {result.stdout}")
            return False
            
    except Exception as e:
        print(f"Error running {script_name}: {e}")
        return False


def verify_and_seed_data():
    """Main function to verify data exists and seed if necessary."""
    print("=" * 60)
    print("Database Data Verification and Seeding")
    print("=" * 60)
    
    # Create all tables first
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created/verified")
    except Exception as e:
        print(f"✗ Error creating database tables: {e}")
        return False
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check cd_data table
        print("\nChecking cd_data table...")
        has_cd_data = check_table_data(db, CDData)
        
        if has_cd_data:
            cd_count = db.query(CDData).count()
            print(f"✓ cd_data table has {cd_count} records")
        else:
            print("⚠ cd_data table is empty, generating data...")
            if not run_generation_script("generate_cd_data.py"):
                print("✗ Failed to generate cd_data")
                return False
        
        # Check spc_limits table
        print("\nChecking spc_limits table...")
        has_spc_limits = check_table_data(db, SPCLimits)
        
        if has_spc_limits:
            spc_count = db.query(SPCLimits).count()
            print(f"✓ spc_limits table has {spc_count} records")
        else:
            print("⚠ spc_limits table is empty, generating data...")
            if not run_generation_script("generate_spc_limits.py"):
                print("✗ Failed to generate spc_limits")
                return False
        
        # Final verification
        print("\n" + "=" * 60)
        print("Final Data Verification:")
        cd_final_count = db.query(CDData).count()
        spc_final_count = db.query(SPCLimits).count()
        
        print(f"• cd_data records: {cd_final_count}")
        print(f"• spc_limits records: {spc_final_count}")
        
        if cd_final_count > 0 and spc_final_count > 0:
            print("✓ All required data is present in the database")
            return True
        else:
            print("✗ Some required data is still missing")
            return False
            
    except Exception as e:
        print(f"Error during verification: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = verify_and_seed_data()
    if success:
        print("\n🎉 Database verification and seeding completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Database verification and seeding failed!")
        sys.exit(1)