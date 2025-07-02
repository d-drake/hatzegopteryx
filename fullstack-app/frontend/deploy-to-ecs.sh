#!/bin/bash

# Frontend ECS Deployment Script
# This script builds and deploys the frontend to AWS ECS

set -e

echo "🚀 Starting frontend deployment to ECS..."

# Check if required environment variables are set
if [ -z "$ECR_REPOSITORY_URL" ]; then
    echo "❌ Error: ECR_REPOSITORY_URL environment variable not set"
    echo "Please set: export ECR_REPOSITORY_URL=<your-ecr-repository-url>"
    exit 1
fi

if [ -z "$ECS_CLUSTER_NAME" ]; then
    echo "❌ Error: ECS_CLUSTER_NAME environment variable not set"
    echo "Please set: export ECS_CLUSTER_NAME=<your-ecs-cluster-name>"
    exit 1
fi

if [ -z "$ECS_SERVICE_NAME" ]; then
    echo "❌ Error: ECS_SERVICE_NAME environment variable not set"
    echo "Please set: export ECS_SERVICE_NAME=<your-ecs-service-name>"
    exit 1
fi

# Set AWS region (default to us-west-1 if not set)
AWS_REGION=${AWS_REGION:-us-west-1}

echo "📋 Deployment Configuration:"
echo "  ECR Repository: $ECR_REPOSITORY_URL"
echo "  ECS Cluster: $ECS_CLUSTER_NAME"
echo "  ECS Service: $ECS_SERVICE_NAME"
echo "  AWS Region: $AWS_REGION"

# Step 1: Login to ECR
echo ""
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URL

# Step 2: Build the Docker image
echo ""
echo "🔨 Building Docker image..."
docker build -t ccdh-frontend -f Dockerfile .

# Step 3: Tag the image for ECR
echo ""
echo "🏷️  Tagging image for ECR..."
docker tag ccdh-frontend:latest $ECR_REPOSITORY_URL:latest

# Also tag with timestamp for versioning
TIMESTAMP=$(date +%Y%m%d%H%M%S)
docker tag ccdh-frontend:latest $ECR_REPOSITORY_URL:$TIMESTAMP

# Step 4: Push to ECR
echo ""
echo "📤 Pushing image to ECR..."
docker push $ECR_REPOSITORY_URL:latest
docker push $ECR_REPOSITORY_URL:$TIMESTAMP

# Step 5: Update ECS service
echo ""
echo "🔄 Updating ECS service to use new image..."
aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION

# Step 6: Wait for deployment to stabilize
echo ""
echo "⏳ Waiting for deployment to stabilize..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION

# Step 7: Get deployment status
echo ""
echo "✅ Deployment complete! Checking status..."
aws ecs describe-services \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION \
    --query 'services[0].deployments[0]' \
    --output table

echo ""
echo "🎉 Frontend deployment successful!"
echo "   The new version is being rolled out across ECS tasks."
echo "   CloudFront may take a few minutes to reflect changes due to caching."