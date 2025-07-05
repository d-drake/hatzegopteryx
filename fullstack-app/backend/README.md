# Backend API

FastAPI-based backend for the CCDH SPC visualization application.

## Directory Structure

```
backend/
├── deployment/             # Deployment configurations
│   ├── lambda/            # AWS Lambda specific files
│   │   └── lambda_handler.py
│   └── scripts/           # Build and deployment scripts
│       ├── build_lambda.sh
│       └── deploy_lambda.sh
├── middleware/            # Custom middleware
│   ├── __init__.py
│   └── security.py
├── routers/              # API route handlers
│   ├── auth.py          # Authentication endpoints
│   ├── spc_cd_l1.py     # SPC CD L1 data endpoints
│   ├── items.py         # Items CRUD
│   ├── spc_limits.py    # SPC limits endpoints
│   └── users.py         # User management
├── scripts/              # Database scripts
│   ├── generate_spc_cd_l1_data.py
│   ├── generate_spc_limits.py
│   └── create_superuser.py
├── security/             # Security utilities
│   ├── csrf.py
│   ├── permissions.py
│   └── rate_limit.py
├── auth.py              # Authentication logic
├── config.py            # Configuration management
├── database.py          # Database connection
├── email_service.py     # Email functionality
├── main.py              # FastAPI application
├── models.py            # SQLAlchemy models
└── requirements.txt     # Python dependencies
```

## Development

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Development

```bash
# From project root
docker compose -f docker-compose.dev.yml up
```

## Deployment

### AWS Lambda Deployment

1. Build the Lambda package:
   ```bash
   cd deployment/scripts
   ./build_lambda.sh
   ```

2. Deploy with Terraform:
   ```bash
   cd ../../../infrastructure/terraform
   terraform apply
   ```

3. Or update existing Lambda:
   ```bash
   cd deployment/scripts
   ./deploy_lambda.sh
   ```

See [Deployment README](deployment/README.md) for detailed instructions.

## API Documentation

When running locally, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

Required environment variables:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key
SUPERUSER_EMAIL=admin@example.com
SUPERUSER_PASSWORD=secure-password
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=.
```

## Database Management

### Generate Test Data

```bash
# Generate SPC CD L1 data
python scripts/generate_spc_cd_l1_data.py

# Generate SPC limits
python scripts/generate_spc_limits.py

# Create superuser
python scripts/create_superuser.py
```

### Migrations

Database tables are created automatically via SQLAlchemy. For production, consider using Alembic for migrations.