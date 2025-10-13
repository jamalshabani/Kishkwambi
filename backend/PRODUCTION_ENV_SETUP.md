# Production Environment Variables Setup

## 🚀 For: https://www7-backend.kanzidata.com

## ⚠️ CRITICAL: Missing Environment Variables

Your production server is currently missing these environment variables, causing OCR to fail.

### Required Environment Variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/

# Server Configuration
PORT=3000
BACKEND_URL=https://www7-backend.kanzidata.com

# API Keys for OCR Services (REQUIRED!)
GOOGLE_VISION_API_KEY=AIzaSyAEDKRvAtyj4jiXyBvJ82kAH2NUnAtIoUQ
PARKPOW_API_KEY=ad4581cae752f8044b83af4ee9595134ba7263ed
PLATERECOGNIZER_API_KEY=c9e3d03d6d9a591d9977da2da771d228ce261622

# Backblaze B2 Configuration (Cloud Storage)
B2_APPLICATION_KEY_ID=003427804eaad560000000001
B2_APPLICATION_KEY=K003ZQy0zNfFQFiezjm+gZZNGLOW4Pc
B2_BUCKET_NAME=simba-terminals-ecd-photos
B2_BUCKET_ID=04d257b8a074aeea9a9d0516
B2_REGION=eu-central-003
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
```

## 📝 How to Add Environment Variables to Production Server

The method depends on how your server is hosted:

### Option 1: If Using Docker

1. Create a `.env` file on the production server:
```bash
ssh user@www7-backend.kanzidata.com
cd /path/to/app
nano .env
# Paste the variables above
# Save and exit (Ctrl+X, Y, Enter)
```

2. Restart the Docker container:
```bash
docker-compose down
docker-compose up -d
```

Or if using docker run:
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/InspectionPhotos:/app/InspectionPhotos \
  --name kishkwambi-backend \
  kishkwambi-backend
```

### Option 2: If Using PM2/Node

1. Create `.env` file:
```bash
ssh user@www7-backend.kanzidata.com
cd /path/to/backend
nano .env
# Paste the variables above
```

2. Restart the server:
```bash
pm2 restart server
# or
pm2 restart all
```

### Option 3: If Using a Hosting Platform

#### Heroku:
```bash
heroku config:set PARKPOW_API_KEY=ad4581cae752f8044b83af4ee9595134ba7263ed
heroku config:set GOOGLE_VISION_API_KEY=AIzaSyAEDKRvAtyj4jiXyBvJ82kAH2NUnAtIoUQ
# ... add all other variables
```

#### Vercel/Netlify/Railway:
- Go to dashboard → Settings → Environment Variables
- Add each variable manually

#### DigitalOcean App Platform:
- Go to App Settings → Environment Variables
- Add each variable

### Option 4: If Using systemd Service

Edit the service file:
```bash
sudo nano /etc/systemd/system/kishkwambi-backend.service
```

Add in the `[Service]` section:
```ini
[Service]
Environment="PARKPOW_API_KEY=ad4581cae752f8044b83af4ee9595134ba7263ed"
Environment="GOOGLE_VISION_API_KEY=AIzaSyAEDKRvAtyj4jiXyBvJ82kAH2NUnAtIoUQ"
Environment="PLATERECOGNIZER_API_KEY=c9e3d03d6d9a591d9977da2da771d228ce261622"
# ... add all other variables
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart kishkwambi-backend
```

## ✅ Verification Steps

After adding environment variables:

### 1. Check Server Health:
```bash
curl https://www7-backend.kanzidata.com/health
```

Should show: `"database": "connected"`

### 2. Test Vision API:
```bash
curl -X POST https://www7-backend.kanzidata.com/api/vision/process-image
```

Should NOT show: "ParkPow API Key not configured" ✅

### 3. Check Server Logs:
```bash
# SSH into server
ssh user@www7-backend.kanzidata.com

# View logs
pm2 logs server
# or
docker logs kishkwambi-backend
# or
journalctl -u kishkwambi-backend -f
```

## 🎯 Quick Fix Command

If you have SSH access to the server:

```bash
# SSH into production server
ssh user@www7-backend.kanzidata.com

# Navigate to backend directory
cd /path/to/backend

# Create .env file (use nano or vi)
cat > .env << 'EOF'
MONGODB_URI=mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/
PORT=3000
BACKEND_URL=https://www7-backend.kanzidata.com
GOOGLE_VISION_API_KEY=AIzaSyAEDKRvAtyj4jiXyBvJ82kAH2NUnAtIoUQ
PARKPOW_API_KEY=ad4581cae752f8044b83af4ee9595134ba7263ed
PLATERECOGNIZER_API_KEY=c9e3d03d6d9a591d9977da2da771d228ce261622
B2_APPLICATION_KEY_ID=003427804eaad560000000001
B2_APPLICATION_KEY=K003ZQy0zNfFQFiezjm+gZZNGLOW4Pc
B2_BUCKET_NAME=simba-terminals-ecd-photos
B2_BUCKET_ID=04d257b8a074aeea9a9d0516
B2_REGION=eu-central-003
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
EOF

# Restart the server (choose appropriate command)
pm2 restart server
# or
docker-compose restart
# or
systemctl restart kishkwambi-backend
```

## 📋 Summary

**Problem**: Production server has no `.env` file with API keys  
**Solution**: Add all environment variables to the production server  
**File Created**: `backend/PRODUCTION_ENV_SETUP.md` with complete guide

Once you add these environment variables and restart the server, the OCR and photo uploads will work! 🎉
