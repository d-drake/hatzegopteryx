"""Create blacklisted_tokens table for Phase 3 security."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine
from models import BlacklistedToken

if __name__ == "__main__":
    # Create only the blacklisted_tokens table
    BlacklistedToken.__table__.create(engine, checkfirst=True)

    print("✓ Created blacklisted_tokens table")
