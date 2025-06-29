terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region for deployment"
  default     = "us-west-1"
}

variable "project_name" {
  description = "Project name"
  default     = "ccdh"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  default     = "prod"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Configuration (using default VPC for cost savings)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-lambda-"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-lambda-sg"
  }
}

# RDS Aurora Serverless v2 (PostgreSQL)
resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.project_name}-cluster"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "appuser"
  master_password    = var.db_password

  # Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    max_capacity = 1
    min_capacity = 0.5
  }

  # Cost optimizations
  skip_final_snapshot    = true  # For test data only
  deletion_protection    = false
  backup_retention_period = 1    # Minimum backup

  vpc_security_group_ids = [aws_security_group.rds.id]

  tags = {
    Name        = "${var.project_name}-aurora-cluster"
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "main" {
  identifier         = "${var.project_name}-instance-1"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  tags = {
    Name        = "${var.project_name}-aurora-instance"
    Environment = var.environment
  }
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_execution" {
  name_prefix = "${var.project_name}-lambda-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda Policies
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Lambda Function
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda_handler.handler"
  runtime       = "python3.13"
  timeout       = 30
  memory_size   = 512

  # This will be updated by the deploy script
  filename = "../../fullstack-app/backend/deployment/scripts/lambda_function.zip"
  
  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      AWS_LAMBDA_ENV = "true"
      DATABASE_URL   = "postgresql://${aws_rds_cluster.main.master_username}:${var.db_password}@${aws_rds_cluster.main.endpoint}:5432/${aws_rds_cluster.main.database_name}"
      # Add other environment variables as needed
      SECRET_KEY     = var.jwt_secret
      ALGORITHM      = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES = "15"
      REFRESH_TOKEN_EXPIRE_DAYS   = "7"
      CORS_ORIGINS   = var.cors_origins
      SUPERUSER_EMAIL     = var.superuser_email
      SUPERUSER_USERNAME  = var.superuser_username
      SUPERUSER_PASSWORD  = var.superuser_password
    }
  }

  tags = {
    Name        = "${var.project_name}-api-lambda"
    Environment = var.environment
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"
  
  # CORS is handled by FastAPI in the Lambda function
  # Removing API Gateway CORS to avoid double CORS handling
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name        = "${var.project_name}-api-stage"
    Environment = var.environment
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# S3 Bucket for Frontend
resource "aws_s3_bucket" "frontend" {
  bucket_prefix = "${var.project_name}-frontend-"

  tags = {
    Name        = "${var.project_name}-frontend"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# CloudFront Distribution
# This now points to the ALB (ECS frontend) instead of S3
# The ccdh.me domain is configured here with proper SSL certificate
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_lb.frontend.dns_name
    origin_id   = "ALB-Frontend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  aliases = ["ccdh.me"]

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Frontend"

    forwarded_values {
      query_string = true
      headers = ["Host", "CloudFront-Forwarded-Proto"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100" # Use only NA and Europe for cost savings

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = "arn:aws:acm:us-east-1:180703225957:certificate/e1cc4e00-d208-4a2b-a0e9-9374efcd8dd8"
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project_name}-cloudfront"
    Environment = var.environment
  }
}

# Outputs
output "api_endpoint" {
  value = aws_apigatewayv2_stage.main.invoke_url
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "s3_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "database_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "rds_endpoint" {
  value = aws_rds_cluster.main.endpoint
  description = "RDS cluster endpoint"
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
  description = "CloudFront distribution ID"
}