# Quick Start Guide - Docker Deployment

This guide will get your Kishkwambi backend running in Docker in minutes!

## Step 1: Prerequisites

Make sure you have:
- ✅ Docker installed and running
- ✅ Docker Compose installed

## Step 2: Set up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add the following required variables to your `.env` file:

```env
# Required
MONGODB_URI=mongodb://admin:password@your-mongo-host:27017/
PORT=3000
EXPO_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:3000

# Optional (for image recognition features)
GOOGLE_VISION_API_KEY=your_key_here
PLATERECOGNIZER_API_KEY=your_key_here
PARKPOW_API_KEY=your_key_here

# Optional (for Backblaze B2 cloud storage)
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_key
B2_BUCKET_NAME=your_bucket_name
B2_BUCKET_ID=your_bucket_id
B2_REGION=eu-central-003
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
```

**Important:** Replace `YOUR_SERVER_IP` with your actual server IP address.

## Step 3: Start the Server

### Option A: Using Helper Script (Recommended)

```bash
./docker-start.sh
```

### Option B: Using Docker Compose Directly

```bash
docker-compose up -d
```

### Option C: Using Docker Directly

```bash
# Build the image
docker build -t kishkwambi-backend .

# Create and set permissions for arrivedContainers
mkdir -p arrivedContainers
chmod 777 arrivedContainers

# Run the container
docker run -d \
  --name kishkwambi-backend \
  -p 3000:3000 \
  -v $(pwd)/arrivedContainers:/app/arrivedContainers \
  --env-file .env \
  kishkwambi-backend
```

## Step 4: Verify It's Running

Check the server health:

```bash
curl http://localhost:3000/health
```

You should see a response like:
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2025-01-11T10:30:00.000Z",
  "database": "connected"
}
```

## Step 5: View Logs

```bash
# Using helper script
./docker-logs.sh

# Or directly
docker-compose logs -f

# Or with Docker
docker logs -f kishkwambi-backend
```

## Common Commands

```bash
# Start server
./docker-start.sh
# or
docker-compose up -d

# Stop server
./docker-stop.sh
# or
docker-compose down

# View logs
./docker-logs.sh
# or
docker-compose logs -f

# Restart server
docker-compose restart

# Rebuild after code changes
docker-compose up -d --build
```

## Troubleshooting

### Can't connect from mobile app

1. **Check your EXPO_PUBLIC_BACKEND_URL**: Make sure it's your server's IP, not `localhost`
2. **Check firewall**: Ensure port 3000 is open
3. **Check network**: Mobile device must be on same network or server must be publicly accessible

### Permission denied on arrivedContainers

```bash
chmod 777 arrivedContainers/
```

### Port 3000 already in use

```bash
# Find what's using the port
lsof -i :3000

# Kill it or change PORT in .env
PORT=3001
```

### Database connection failed

1. Check MONGODB_URI is correct
2. Ensure MongoDB is accessible from Docker container
3. Check MongoDB is running

## File Permissions

The `arrivedContainers` directory has 777 permissions to allow:
- ✅ Docker container to write uploaded photos
- ✅ Host system to read/manage photos
- ✅ Backup scripts to access photos

## Backup Your Photos

Always backup the arrivedContainers directory:

```bash
# Create backup
tar -czf arrivedContainers-backup-$(date +%Y%m%d).tar.gz arrivedContainers/

# Restore from backup
tar -xzf arrivedContainers-backup-YYYYMMDD.tar.gz
```

## Next Steps

- See [DOCKER_README.md](DOCKER_README.md) for detailed documentation
- Set up automated backups
- Configure SSL/TLS for production
- Set up monitoring and logging

## Need Help?

1. Check logs: `./docker-logs.sh`
2. Check health: `curl http://localhost:3000/health`
3. Verify container is running: `docker ps`
4. Check environment: `docker exec kishkwambi-backend env`

