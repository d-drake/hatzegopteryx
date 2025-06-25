#!/bin/bash
set -e

echo "Starting backend in CI mode (minimal data seeding)..."

# Ensure we're in the app directory
cd /app

# Only create tables, skip heavy data generation in CI
echo "Creating database tables..."
python -c "
from database import engine, Base
import models
Base.metadata.create_all(bind=engine)
print('✓ Database tables created successfully')
"

if [ $? -eq 0 ]; then
    echo "✓ Database setup completed successfully"
    echo "Starting FastAPI server..."
    exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "✗ Database setup failed"
    exit 1
fi