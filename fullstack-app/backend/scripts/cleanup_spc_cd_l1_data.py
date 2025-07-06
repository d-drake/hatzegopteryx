#!/usr/bin/env python3
"""
Clean up spc_cd_l1 table by removing specified records.

This script removes:
1. All rows where Process_Type == 900
2. All rows where Process_Type == 1000 AND Product_Type == 'XLY1'
3. All rows where Process_Type == 1100 AND Product_Type IN ('VLQR1', 'XLY1', 'XLY2')

Expected to remove approximately 2/3 of the data (66.7%).
"""

import sys
import os
from sqlalchemy import create_engine, func, and_, or_, delete
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SPCCdL1, SPCLimits
from config import get_settings


def cleanup_spc_cd_l1_data(dry_run=True, force=False):
    """
    Clean up spc_cd_l1 table by removing specified records.

    Args:
        dry_run (bool): If True, only show what would be deleted without actually deleting.
        force (bool): If True, skip confirmation prompt (for non-interactive execution).
    """
    # Create database connection
    settings = get_settings()
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Get initial record count
        initial_count = session.query(func.count(SPCCdL1.lot)).scalar()
        print(f"\nInitial record count: {initial_count:,}")

        if dry_run:
            print("\n🔍 DRY RUN MODE - No data will be deleted")
        else:
            print("\n⚠️  PRODUCTION MODE - Data WILL be deleted!")

        # Count records to be deleted
        print("\n=== Records to be deleted ===")

        # Deletion 1: Process_Type == 900
        deletion1_query = session.query(SPCCdL1).filter(SPCCdL1.process_type == "900")
        deletion1_count = deletion1_query.count()
        print(f"\n1. Process_Type == '900': {deletion1_count:,} records")

        # Deletion 2: Process_Type == 1000 AND Product_Type == 'XLY1'
        deletion2_query = session.query(SPCCdL1).filter(
            and_(SPCCdL1.process_type == "1000", SPCCdL1.product_type == "XLY1")
        )
        deletion2_count = deletion2_query.count()
        print(
            f"2. Process_Type == '1000' AND Product_Type == 'XLY1': {deletion2_count:,} records"
        )

        # Deletion 3: Process_Type == 1100 AND Product_Type IN ('VLQR1', 'XLY1', 'XLY2')
        deletion3_query = session.query(SPCCdL1).filter(
            and_(
                SPCCdL1.process_type == "1100",
                SPCCdL1.product_type.in_(["VLQR1", "XLY1", "XLY2"]),
            )
        )
        deletion3_count = deletion3_query.count()
        print(
            f"3. Process_Type == '1100' AND Product_Type IN ('VLQR1', 'XLY1', 'XLY2'): {deletion3_count:,} records"
        )

        total_to_delete = deletion1_count + deletion2_count + deletion3_count
        deletion_percentage = (total_to_delete / initial_count) * 100
        remaining_count = initial_count - total_to_delete

        print(
            f"\nTotal to delete: {total_to_delete:,} records ({deletion_percentage:.1f}%)"
        )
        print(
            f"Will remain: {remaining_count:,} records ({100 - deletion_percentage:.1f}%)"
        )

        # Check SPC limits that would be affected
        print("\n=== SPC Limits Impact ===")

        # SPC limits for Process_Type 900
        spc_limits_900 = (
            session.query(func.count(SPCLimits.id))
            .filter(SPCLimits.process_type == "900")
            .scalar()
        )

        # SPC limits for specific process/product combinations
        spc_limits_1000_xly1 = (
            session.query(func.count(SPCLimits.id))
            .filter(
                and_(SPCLimits.process_type == "1000", SPCLimits.product_type == "XLY1")
            )
            .scalar()
        )

        spc_limits_1100_affected = (
            session.query(func.count(SPCLimits.id))
            .filter(
                and_(
                    SPCLimits.process_type == "1100",
                    SPCLimits.product_type.in_(["VLQR1", "XLY1", "XLY2"]),
                )
            )
            .scalar()
        )

        total_spc_affected = (
            spc_limits_900 + spc_limits_1000_xly1 + spc_limits_1100_affected
        )
        print(f"SPC limits records affected: {total_spc_affected}")

        if not dry_run:
            # Confirm before deletion
            print("\n" + "=" * 50)
            print("⚠️  WARNING: This will permanently delete data!")
            print("=" * 50)

            if not force:
                confirmation = input("\nType 'DELETE' to confirm deletion: ")

                if confirmation != "DELETE":
                    print("\n❌ Deletion cancelled.")
                    return
            else:
                print("\n🚀 Force flag set - skipping confirmation")

            print("\n🗑️  Deleting records...")

            # Delete SPC CD L1 data
            deleted1 = deletion1_query.delete(synchronize_session=False)
            print(f"✓ Deleted {deleted1:,} records where Process_Type == '900'")

            deleted2 = deletion2_query.delete(synchronize_session=False)
            print(
                f"✓ Deleted {deleted2:,} records where Process_Type == '1000' AND Product_Type == 'XLY1'"
            )

            deleted3 = deletion3_query.delete(synchronize_session=False)
            print(
                f"✓ Deleted {deleted3:,} records where Process_Type == '1100' AND Product_Type IN ('VLQR1', 'XLY1', 'XLY2')"
            )

            # Delete corresponding SPC limits
            spc_deleted1 = (
                session.query(SPCLimits)
                .filter(SPCLimits.process_type == "900")
                .delete(synchronize_session=False)
            )

            spc_deleted2 = (
                session.query(SPCLimits)
                .filter(
                    and_(
                        SPCLimits.process_type == "1000",
                        SPCLimits.product_type == "XLY1",
                    )
                )
                .delete(synchronize_session=False)
            )

            spc_deleted3 = (
                session.query(SPCLimits)
                .filter(
                    and_(
                        SPCLimits.process_type == "1100",
                        SPCLimits.product_type.in_(["VLQR1", "XLY1", "XLY2"]),
                    )
                )
                .delete(synchronize_session=False)
            )

            total_spc_deleted = spc_deleted1 + spc_deleted2 + spc_deleted3
            print(f"\n✓ Deleted {total_spc_deleted} SPC limits records")

            # Commit the transaction
            session.commit()

            # Verify final count
            final_count = session.query(func.count(SPCCdL1.lot)).scalar()
            print(f"\n✅ Deletion complete!")
            print(
                f"Final record count: {final_count:,} (expected: {remaining_count:,})"
            )

            if final_count == remaining_count:
                print("✓ Record count matches expected value")
            else:
                print(
                    f"⚠️  WARNING: Record count mismatch! Expected {remaining_count:,}, got {final_count:,}"
                )

        else:
            print("\n✅ Dry run complete. No data was deleted.")
            print("Run with --execute flag to perform actual deletion.")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Clean up spc_cd_l1 table")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete the data (default is dry run)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompt (for non-interactive execution)",
    )

    args = parser.parse_args()

    print("SPC CD L1 Data Cleanup Script")
    print("=" * 50)

    cleanup_spc_cd_l1_data(dry_run=not args.execute, force=args.force)
