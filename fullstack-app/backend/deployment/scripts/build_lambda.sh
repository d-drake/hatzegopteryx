#!/bin/bash
# Build script for AWS Lambda deployment

echo "Building Lambda deployment package..."

# Clean up previous builds
rm -rf lambda_build/
rm -f lambda_function.zip

# Create build directory
mkdir -p lambda_build

# Copy application files
echo "Copying application files..."
# Copy all Python files from backend root
cp ../../*.py lambda_build/
# Copy the Lambda handler
cp ../lambda/lambda_handler.py lambda_build/
# Copy application directories
cp -r ../../routers lambda_build/
cp -r ../../middleware lambda_build/
cp -r ../../security lambda_build/
cp -r ../../scripts lambda_build/

# Install dependencies
echo "Installing dependencies..."
pip install -r ../../requirements.txt -t lambda_build/ --platform manylinux2014_x86_64 --only-binary=:all:

# Remove unnecessary files to reduce package size
echo "Cleaning up unnecessary files..."
find lambda_build -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
# Keep .dist-info directories - they contain important metadata
# find lambda_build -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find lambda_build -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find lambda_build -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
rm -rf lambda_build/boto3 lambda_build/botocore  # AWS Lambda provides these

# Create deployment package
echo "Creating deployment package..."
cd lambda_build
zip -r ../lambda_function.zip . -x "*.pyc" -x "*__pycache__*"
cd ..

# Get package size
PACKAGE_SIZE=$(du -h lambda_function.zip | cut -f1)
echo "Lambda package created: lambda_function.zip (${PACKAGE_SIZE})"

# Verify package size is under Lambda limit (250MB unzipped)
UNZIPPED_SIZE=$(unzip -l lambda_function.zip | tail -1 | awk '{print $1}')
UNZIPPED_MB=$((UNZIPPED_SIZE / 1024 / 1024))

if [ $UNZIPPED_MB -gt 250 ]; then
    echo "WARNING: Package size (${UNZIPPED_MB}MB) exceeds Lambda limit (250MB)"
    echo "Consider using Lambda Layers for dependencies"
else
    echo "Package size OK: ${UNZIPPED_MB}MB / 250MB"
fi

echo "Build complete!"