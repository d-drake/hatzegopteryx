#!/bin/bash
set -e

echo "Starting backend in CI mode (minimal data seeding)..."

# Ensure we're in the app directory
cd /app

# Wait for database to be ready
echo "Waiting for database to be ready..."
for i in {1..30}; do
    python -c "from database import engine; engine.connect()" 2>/dev/null && break
    echo "Attempt $i/30: Database not ready, waiting..."
    sleep 2
done

# Only create tables, skip heavy data generation in CI
echo "Creating database tables..."
python -c "
from database import engine, Base
import models
try:
    Base.metadata.create_all(bind=engine)
    print('✓ Database tables created successfully')
except Exception as e:
    print(f'✗ Failed to create tables: {e}')
    import sys
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    echo "✓ Database setup completed successfully"
    echo "Starting FastAPI server..."
    exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "✗ Database setup failed"
    exit 1
fi