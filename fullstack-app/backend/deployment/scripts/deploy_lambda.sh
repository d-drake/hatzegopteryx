#!/bin/bash
# Deploy script for AWS Lambda

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Error: AWS CLI not configured. Please run 'aws configure'"
    exit 1
fi

# Configuration
FUNCTION_NAME="ccdh-api"
REGION=${AWS_REGION:-"us-west-1"}
RUNTIME="python3.13"
HANDLER="lambda_handler.handler"
TIMEOUT=30
MEMORY_SIZE=512

# Build the package
echo "Building Lambda package..."
./build_lambda.sh

if [ ! -f lambda_function.zip ]; then
    echo "Error: Build failed - lambda_function.zip not found"
    exit 1
fi

# Check if function exists
echo "Checking if Lambda function exists..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION > /dev/null 2>&1; then
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --region $REGION \
        --zip-file fileb://lambda_function.zip
    
    echo "Waiting for update to complete..."
    aws lambda wait function-updated \
        --function-name $FUNCTION_NAME \
        --region $REGION
    
    echo "Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --region $REGION \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE
else
    echo "Lambda function does not exist. Please create it first using Terraform or AWS Console."
    echo "Example command:"
    echo "aws lambda create-function \\"
    echo "  --function-name $FUNCTION_NAME \\"
    echo "  --runtime $RUNTIME \\"
    echo "  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \\"
    echo "  --handler $HANDLER \\"
    echo "  --timeout $TIMEOUT \\"
    echo "  --memory-size $MEMORY_SIZE \\"
    echo "  --zip-file fileb://lambda_function.zip"
    exit 1
fi

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in Lambda console or via CLI"
echo "2. Configure API Gateway to point to this Lambda function"
echo "3. Test the endpoints"