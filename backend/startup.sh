#!/bin/bash
set -e

echo "Starting backend with data verification..."

# Ensure we're in the app directory
cd /app

# Run the data verification and seeding script from the app directory
echo "Running data verification and seeding..."
python -m scripts.verify_and_seed_data

# Check if the verification script succeeded
if [ $? -eq 0 ]; then
    echo "✓ Data verification and seeding completed successfully"
    echo "Starting FastAPI server..."
    exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "✗ Data verification and seeding failed"
    exit 1
fi