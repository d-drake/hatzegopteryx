# Fullstack App

A modern fullstack application built with PostgreSQL, FastAPI, and React TypeScript.

## Tech Stack

- **Database**: PostgreSQL 16
- **Backend**: FastAPI (Python 3.13)
- **Frontend**: React with TypeScript
- **Containerization**: Docker & Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/d-drake/fullstack-app.git
cd fullstack-app
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Start the application:
```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Backend

The FastAPI backend provides a RESTful API with automatic documentation. Key features:
- SQLAlchemy ORM for database operations
- Pydantic for data validation
- Automatic API documentation with Swagger UI

### Frontend

The React TypeScript frontend features:
- Modern React with hooks
- TypeScript for type safety
- Axios for API communication
- Responsive design

## API Endpoints

- `GET /api/items/` - List all items
- `POST /api/items/` - Create a new item
- `GET /api/items/{id}` - Get a specific item
- `PUT /api/items/{id}` - Update an item
- `DELETE /api/items/{id}` - Delete an item

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request