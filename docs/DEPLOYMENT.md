# Deployment Guide

## Local Development (FastAPI Full Stack Template)

### Quick Start
```bash
# Start services (uses Docker Compose)
docker-compose up -d

# Or with the newer docker compose:
docker compose up -d

# Frontend: http://localhost:5173
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Adminer: http://localhost:8080 (database)
```

### Build Images
```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d
```

## Environment Variables

Update `.env` file with secure values:
```bash
SECRET_KEY=your-secret-key-here
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=secure-password
POSTGRES_PASSWORD=secure-password
```

## Database

### Initialize Database
```bash
# Run migrations (automatically done on startup)
# Or manually:
docker-compose exec backend bash -c "alembic upgrade head"
```

### Create New Migration
```bash
docker-compose exec backend alembic revision --autogenerate -m "add new field"
docker-compose exec backend alembic upgrade head
```

## Testing

```bash
# Run tests
docker-compose exec backend bash scripts/tests-start.sh
```

## Monitoring

### Health Check
```bash
# Backend health
curl http://localhost:8000/docs

# Check containers
docker-compose ps
```

### Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

## Common Commands

```bash
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose build          # Build images
docker-compose logs -f        # View logs
docker-compose exec backend bash  # Exec into backend
```

## Production Deployment

### Build and Push
```bash
# Build images
docker-compose build

# Tag and push (adjust registry as needed)
docker tag backend:latest workstation:5000/jcrm-backend:latest
docker push workstation:5000/jcrm-backend:latest

docker tag frontend:latest workstation:5000/jcrm-frontend:latest
docker push workstation:5000/jcrm-frontend:latest
```

### Deploy to Kubernetes (Homelab Style)
See `docs/ARCHITECTURE.md` for details on integrating with your homelab's Kubernetes cluster.