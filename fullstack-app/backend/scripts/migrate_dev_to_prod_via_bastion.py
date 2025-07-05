#!/usr/bin/env python3
"""
Production Database Migration via Bastion Host

Urgently migrates data from development database to production database
using the existing bastion host setup. Preserves production user accounts
and only migrates the data tables.

Tables migrated:
- spc_cd_l1 (main measurement data)
- spc_limits (SPC control limits)
- items (demo functionality)

Tables preserved (production user data):
- users, registration_requests, refresh_tokens, audit_logs, blacklisted_tokens
"""

import os
import sys
import time
import subprocess
import getpass
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import pandas as pd

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database connection strings
DEV_DATABASE_URL = "postgresql://appuser:apppassword@localhost:5433/appdb"
# Production via SSH tunnel (bastion creates tunnel to localhost:5432)
# Password will be prompted for securely
PROD_DATABASE_URL = None  # Will be constructed with prompted password

# Tables to migrate (explicitly excluding user-related tables)
TABLES_TO_MIGRATE = [
    'spc_cd_l1',      # Main measurement data (formerly cd_data)
    'spc_limits',     # SPC control limits
    'items'           # Demo functionality
]

def log_message(message: str, level: str = "INFO"):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def check_ssh_tunnel():
    """Check if SSH tunnel is active on port 5432"""
    try:
        result = subprocess.run(
            ["lsof", "-ti:5432"], 
            capture_output=True, 
            text=True
        )
        if result.returncode == 0:
            log_message("✓ SSH tunnel detected on port 5432")
            return True
        else:
            log_message("✗ No SSH tunnel found on port 5432", "ERROR")
            return False
    except Exception as e:
        log_message(f"Could not check SSH tunnel: {e}", "WARNING")
        return False

def test_databases():
    """Test connections to both databases"""
    log_message("Testing database connections...")
    
    try:
        # Test development database
        log_message("Testing development database...")
        dev_engine = create_engine(DEV_DATABASE_URL)
        with dev_engine.connect() as conn:
            result = conn.execute(text("SELECT version()")).scalar()
            log_message("✓ Development database connected")
        
        # Test production database (via tunnel)
        log_message("Testing production database via SSH tunnel...")
        prod_engine = create_engine(PROD_DATABASE_URL)
        with prod_engine.connect() as conn:
            result = conn.execute(text("SELECT version()")).scalar()
            log_message("✓ Production database connected via tunnel")
            
        return dev_engine, prod_engine
        
    except SQLAlchemyError as e:
        log_message(f"✗ Database connection failed: {e}", "ERROR")
        return None, None

def get_table_counts(engine, table_name: str):
    """Get record count for a table"""
    try:
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table_name}'
                );
            """)).scalar()
            
            if not result:
                return 0
                
            # Get record count
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
            return count
            
    except SQLAlchemyError as e:
        log_message(f"Error getting count for {table_name}: {e}", "ERROR")
        return 0

def migrate_table(dev_engine, prod_engine, table_name: str):
    """Migrate a single table from dev to prod"""
    log_message(f"Migrating table: {table_name}")
    
    try:
        # Get source data count
        dev_count = get_table_counts(dev_engine, table_name)
        log_message(f"Source {table_name}: {dev_count} records")
        
        if dev_count == 0:
            log_message(f"⚠️  No data to migrate for {table_name}")
            return True
            
        # Read data from development database
        log_message(f"Reading data from development...")
        df = pd.read_sql_table(table_name, dev_engine)
        log_message(f"✓ Read {len(df)} records")
        
        # Write data to production database (replace existing)
        log_message(f"Writing data to production...")
        df.to_sql(table_name, prod_engine, if_exists='replace', index=False, method='multi')
        
        # Verify migration
        prod_count = get_table_counts(prod_engine, table_name)
        log_message(f"Target {table_name}: {prod_count} records")
        
        if dev_count == prod_count:
            log_message(f"✓ Successfully migrated {table_name}")
            return True
        else:
            log_message(f"✗ Migration verification failed for {table_name}", "ERROR")
            return False
            
    except Exception as e:
        log_message(f"✗ Failed to migrate {table_name}: {e}", "ERROR")
        return False

def main():
    """Main migration execution"""
    global PROD_DATABASE_URL
    
    log_message("=" * 60)
    log_message("URGENT PRODUCTION DATABASE MIGRATION VIA BASTION")
    log_message("=" * 60)
    log_message(f"Migration scope: {', '.join(TABLES_TO_MIGRATE)}")
    log_message("User tables will be PRESERVED (not modified)")
    log_message("=" * 60)
    
    # Check if SSH tunnel is active
    if not check_ssh_tunnel():
        log_message("SSH tunnel not detected. Please start the tunnel first:", "ERROR")
        log_message("Run: cd /home/dwdra/workspace/hatzegopteryx/infrastructure/scripts", "ERROR")
        log_message("Then: ./manage-bastion.sh tunnel", "ERROR")
        log_message("This will create tunnel: localhost:5432 -> RDS", "ERROR")
        return 1
    
    # Get production database password from environment or prompt
    prod_password = os.getenv('PROD_DB_PASSWORD')
    if not prod_password:
        log_message("Please enter the production database password (from terraform.tfvars):")
        try:
            prod_password = getpass.getpass("Production DB Password: ")
        except Exception as e:
            log_message(f"Password input failed: {e}", "ERROR")
            log_message("You can also set PROD_DB_PASSWORD environment variable", "ERROR")
            return 1
    
    if not prod_password.strip():
        log_message("Password cannot be empty", "ERROR")
        return 1
    
    # Construct production database URL
    PROD_DATABASE_URL = f"postgresql://appuser:{prod_password}@localhost:5432/appdb"
    
    # Test database connections
    dev_engine, prod_engine = test_databases()
    if not dev_engine or not prod_engine:
        log_message("Database connection failed. Cannot proceed.", "ERROR")
        return 1
    
    # Show current table status
    log_message("\nCurrent table status:")
    log_message("-" * 40)
    
    for table_name in TABLES_TO_MIGRATE:
        dev_count = get_table_counts(dev_engine, table_name)
        prod_count = get_table_counts(prod_engine, table_name)
        log_message(f"DEV  {table_name}: {dev_count:,} records")
        log_message(f"PROD {table_name}: {prod_count:,} records")
        log_message("-" * 20)
    
    # Verify user tables exist in production (to preserve)
    log_message("\nProduction user tables (to preserve):")
    log_message("-" * 40)
    user_tables = ['users', 'registration_requests', 'refresh_tokens', 'audit_logs', 'blacklisted_tokens']
    for table in user_tables:
        count = get_table_counts(prod_engine, table)
        if count > 0:
            log_message(f"✓ {table}: {count} records (will preserve)")
        else:
            log_message(f"ℹ️  {table}: not found or empty")
    
    # Confirm migration
    log_message("\n" + "=" * 60)
    log_message("READY TO START MIGRATION")
    log_message("This will REPLACE data in production for specified tables")
    log_message("User tables will be PRESERVED")
    log_message("=" * 60)
    
    # Check for auto-confirm flag
    if len(sys.argv) > 1 and sys.argv[1] == '--confirm':
        log_message("Auto-confirming migration via --confirm flag")
        response = 'yes'
    else:
        try:
            response = input("\nProceed with urgent migration? (yes/no): ").strip().lower()
        except EOFError:
            log_message("No input received, migration cancelled")
            return 0
    
    if response != 'yes':
        log_message("Migration cancelled by user")
        return 0
    
    # Execute migration
    log_message("\nStarting urgent migration...")
    log_message("=" * 60)
    
    start_time = time.time()
    success_count = 0
    
    for table_name in TABLES_TO_MIGRATE:
        if migrate_table(dev_engine, prod_engine, table_name):
            success_count += 1
        log_message("-" * 40)
    
    # Final verification
    log_message("\nFinal verification:")
    log_message("-" * 40)
    
    all_verified = True
    for table_name in TABLES_TO_MIGRATE:
        dev_count = get_table_counts(dev_engine, table_name)
        prod_count = get_table_counts(prod_engine, table_name)
        
        if dev_count == prod_count:
            log_message(f"✓ {table_name}: {prod_count:,} records (verified)")
        else:
            log_message(f"✗ {table_name}: MISMATCH dev={dev_count:,} prod={prod_count:,}", "ERROR")
            all_verified = False
    
    # Summary
    elapsed_time = time.time() - start_time
    log_message("\n" + "=" * 60)
    log_message("URGENT MIGRATION SUMMARY")
    log_message("=" * 60)
    log_message(f"Tables migrated: {success_count}/{len(TABLES_TO_MIGRATE)}")
    log_message(f"Elapsed time: {elapsed_time:.2f} seconds")
    log_message(f"Verification: {'✓ PASSED' if all_verified else '✗ FAILED'}")
    
    if success_count == len(TABLES_TO_MIGRATE) and all_verified:
        log_message("🎉 URGENT MIGRATION COMPLETED SUCCESSFULLY")
        log_message("Production database is now updated with latest schema and data")
        log_message("Lambda function should now work with correct table names")
        return 0
    else:
        log_message("❌ URGENT MIGRATION FAILED OR INCOMPLETE", "ERROR")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        log_message("\nMigration interrupted by user", "WARNING")
        sys.exit(1)
    except Exception as e:
        log_message(f"Unexpected error: {e}", "ERROR")
        sys.exit(1)