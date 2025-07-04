"""
AWS Lambda handler for FastAPI application using Mangum adapter.
"""

import os
import logging
from mangum import Mangum
from main import app

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Set Lambda environment flag
os.environ["AWS_LAMBDA_ENV"] = "true"

# Create the Mangum handler
mangum_handler = Mangum(app, lifespan="off")


def handler(event, context):
    """Custom handler to ensure OPTIONS requests return 200"""
    # Log the request
    logger.info(f"Request: {event.get('httpMethod')} {event.get('path')}")

    # Handle OPTIONS requests directly for CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        origin = event.get("headers", {}).get("origin", "")

        # Check if origin is allowed
        allowed_origin = origin if origin in cors_origins else cors_origins[0]

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": allowed_origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            },
            "body": "",
        }

    # For all other requests, use Mangum
    return mangum_handler(event, context)


# Log cold starts
logger.info("Lambda function initialized - cold start")
