# Docker Deployment Guide

This guide will help you deploy the Kishkwambi backend server using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (comes with Docker Desktop)
- `.env` file with all required environment variables

## Quick Start

### 1. Set up your environment file

Create a `.env` file in the `backend` directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://admin:password@host:27017/
PORT=3000

# Backend URL (for photo references)
BACKEND_URL=http://192.168.1.100:3000

# Backblaze B2 Configuration
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_key
B2_BUCKET_NAME=your_bucket_name
B2_BUCKET_ID=your_bucket_id
B2_REGION=eu-central-003
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com

# API Keys
GOOGLE_VISION_API_KEY=your_google_api_key
PLATERECOGNIZER_API_KEY=your_platerecognizer_key
PARKPOW_API_KEY=your_parkrow_key
```

### 2. Build and run with Docker Compose

```bash
# Navigate to backend directory
cd backend

# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 3. Build and run with Docker (without Compose)

```bash
# Build the image
docker build -t kishkwambi-backend .

# Create arrivedContainers directory with proper permissions
mkdir -p arrivedContainers
chmod 777 arrivedContainers

# Run the container
docker run -d \
  --name kishkwambi-backend \
  -p 3000:3000 \
  -v $(pwd)/arrivedContainers:/app/arrivedContainers \
  --env-file .env \
  kishkwambi-backend

# View logs
docker logs -f kishkwambi-backend

# Stop the container
docker stop kishkwambi-backend

# Remove the container
docker rm kishkwambi-backend
```

## Volume Management

### arrivedContainers Directory

The `arrivedContainers` directory stores all container and damage photos. This directory is:

- **Persisted**: Mounted as a volume to survive container restarts
- **Writable**: Has 777 permissions to allow any user to read/write
- **Backed up**: Should be included in your backup strategy

### Managing the Volume

```bash
# Check volume size
du -sh arrivedContainers/

# Backup the volume
tar -czf arrivedContainers-backup-$(date +%Y%m%d).tar.gz arrivedContainers/

# Restore from backup
tar -xzf arrivedContainers-backup-YYYYMMDD.tar.gz
```

## Useful Commands

### Container Management

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs
docker logs kishkwambi-backend

# Follow logs in real-time
docker logs -f kishkwambi-backend

# Execute commands in running container
docker exec -it kishkwambi-backend sh

# Restart the container
docker restart kishkwambi-backend

# View container resource usage
docker stats kishkwambi-backend
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi kishkwambi-backend

# Prune unused images
docker image prune -a
```

### Health Check

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' kishkwambi-backend

# Test health endpoint directly
curl http://localhost:3000/health
```

## Troubleshooting

### Container won't start

1. Check logs: `docker logs kishkwambi-backend`
2. Verify environment variables: `docker exec kishkwambi-backend env`
3. Ensure MongoDB is accessible from the container

### Permission issues with arrivedContainers

```bash
# Fix permissions on host
chmod 777 arrivedContainers/

# Or set ownership to match container user (UID 1001)
chown -R 1001:1001 arrivedContainers/
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
PORT=3001
```

## Production Deployment

### Using Docker Compose

For production, consider:

1. **Use a reverse proxy** (nginx, traefik) for SSL/TLS
2. **Set up monitoring** (Prometheus, Grafana)
3. **Configure log rotation**
4. **Set up automated backups** for arrivedContainers
5. **Use Docker secrets** for sensitive data instead of .env

### Example with nginx reverse proxy

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    # ... existing configuration ...
    expose:
      - "3001"
    networks:
      - internal

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    networks:
      - internal
    depends_on:
      - backend

networks:
  internal:
    driver: bridge
```

## Updates and Maintenance

### Updating the application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Or with Docker directly
docker stop kishkwambi-backend
docker rm kishkwambi-backend
docker build -t kishkwambi-backend .
docker run -d \
  --name kishkwambi-backend \
  -p 3000:3000 \
  -v $(pwd)/arrivedContainers:/app/arrivedContainers \
  --env-file .env \
  kishkwambi-backend
```

### Database Migration

If you need to run database migrations:

```bash
docker exec -it kishkwambi-backend node migrations/migrate.js
```

## Security Considerations

1. **Never commit .env files** to version control
2. **Use strong passwords** for database connections
3. **Regularly update** Docker base images
4. **Scan images** for vulnerabilities: `docker scan kishkwambi-backend`
5. **Limit container resources** to prevent DoS
6. **Use read-only file systems** where possible
7. **Run security audits**: `npm audit`

## Support

For issues or questions, please check:
- Application logs: `docker logs kishkwambi-backend`
- Health endpoint: http://localhost:3000/health
- Test endpoint: http://localhost:3000/api/test

