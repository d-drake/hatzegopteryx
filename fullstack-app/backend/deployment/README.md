# Backend Deployment Configuration

This directory contains all deployment-related files for the backend application.

## Directory Structure

```
deployment/
├── lambda/                 # Lambda-specific files
│   └── lambda_handler.py   # AWS Lambda entry point using Mangum adapter
├── scripts/                # Deployment and build scripts
│   ├── build_lambda.sh     # Builds Lambda deployment package
│   └── deploy_lambda.sh    # Deploys Lambda function (updates code)
└── README.md              # This file
```

## Lambda Deployment

### Building the Lambda Package

From the backend directory:
```bash
cd deployment/scripts
./build_lambda.sh
```

This will create `lambda_function.zip` in the scripts directory.

### Deploying to AWS Lambda

#### Using Terraform (Recommended)
```bash
cd ../../../infrastructure/terraform
terraform apply
```

#### Using the Deploy Script
```bash
cd deployment/scripts
./deploy_lambda.sh
```

### Manual Deployment
```bash
# Update function code
aws lambda update-function-code \
  --function-name ccdh-api \
  --zip-file fileb://lambda_function.zip \
  --region us-west-1
```

## Files Description

### lambda/lambda_handler.py
- AWS Lambda entry point
- Uses Mangum adapter to handle Lambda events and convert them to ASGI requests
- Configures logging and sets Lambda environment flags

### scripts/build_lambda.sh
- Creates Lambda deployment package
- Installs dependencies for Linux/Lambda runtime
- Optimizes package size by removing unnecessary files
- Preserves required metadata (.dist-info directories)

### scripts/deploy_lambda.sh
- Updates existing Lambda function code
- Waits for deployment to complete
- Updates function configuration (timeout, memory)
- Requires AWS CLI to be configured

## Environment Variables

Lambda environment variables are configured via Terraform or can be updated manually:

```bash
aws lambda update-function-configuration \
  --function-name ccdh-api \
  --environment file://path/to/lambda-env-vars.json
```

See `/infrastructure/terraform/lambda-env-vars.json` for the required variables.