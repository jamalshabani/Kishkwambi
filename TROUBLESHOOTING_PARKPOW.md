# ParkPow API Troubleshooting Guide

## Issue: ParkPow API not returning container numbers

This guide will help you diagnose why the ParkPow API isn't extracting container numbers from photos.

---

## Step 1: Verify Backend Server Has Latest Code

Your Docker container on the production server needs to have the updated code with logging.

**On your production server (www7-backend.kanzidata.com):**

```bash
# SSH into your server
ssh your-server

# Navigate to backend directory
cd /path/to/kishkwambi/backend

# Pull latest code
git pull

# Restart Docker container to load new code
docker-compose down
docker-compose up -d --build

# OR if using Docker directly:
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

---

## Step 2: Verify Environment Variables in Docker

Check if PARKPOW_API_KEY is loaded in your Docker container:

```bash
# Check environment variables in running container
docker exec kishkwambi-backend env | grep PARKPOW_API_KEY

# Should output:
# PARKPOW_API_KEY=ad4581cae752f8044b83af4ee9595134ba7263ed

# If it's empty or missing, your .env file isn't being loaded!
```

**Fix if missing:**
```bash
# Make sure .env file is in the backend directory
ls -la /path/to/backend/.env

# Restart container with --env-file flag
docker run -d \
  --name kishkwambi-backend \
  --env-file .env \
  ...
```

---

## Step 3: Check Docker Logs During Photo Upload

When you take a photo and it tries to recognize the container number, check the logs:

```bash
# Watch logs in real-time
docker logs -f kishkwambi-backend

# You should see:
# 📸 ParkPow API Response Status: 200
# 📸 ParkPow API Raw Response: { ... }
# ✅ Formatted Response: { ... }
```

**What to look for:**

### A) If you see "ParkPow API key not configured":
```bash
# Your .env file isn't loaded
# Fix: Restart container with --env-file .env
```

### B) If you see "ParkPow API Error":
```json
{
  "success": false,
  "error": "ParkPow API Error: ...",
  "rawResponse": { ... }
}
```
- Check the error message
- Verify your API key is valid
- Test the API key directly (see Step 5)

### C) If you see empty containerNumber:
```json
{
  "success": true,
  "data": {
    "containerNumber": "",
    "isoCode": ""
  }
}
```
- ParkPow couldn't read the container
- Photo quality might be poor
- Container number not visible in frame

---

## Step 4: Test ParkPow API Directly

Test if your API key works by calling ParkPow directly:

```bash
# From your local machine or server
curl -X POST https://container-api.parkpow.com/api/v1/predict/ \
  -H "Authorization: Token ad4581cae752f8044b83af4ee9595134ba7263ed" \
  -F "image=@/path/to/test/container/photo.jpg"

# Expected response (if working):
{
  "results": [
    {
      "object": {
        "label": "Owner Code and Category Identifier"
      },
      "texts": [
        {
          "value": "ABCD",
          "score": 0.95
        }
      ]
    },
    {
      "object": {
        "label": "Serial Number"
      },
      "texts": [
        {
          "value": "1234567",
          "score": 0.92
        }
      ]
    }
  ]
}
```

**If this fails:**
- ❌ API key is invalid or expired
- ❌ Account has no credits
- ❌ Network connectivity issue

---

## Step 5: Check Network Connectivity from Container

Verify your Docker container can reach ParkPow API:

```bash
# Test from inside the container
docker exec kishkwambi-backend curl -I https://container-api.parkpow.com

# Should return HTTP 200 or 405 (method not allowed is OK for HEAD request)

# If it fails:
# - Check firewall rules
# - Check DNS resolution
# - Check internet connectivity from container
```

---

## Step 6: Verify Mobile App is Calling Correct Endpoint

In your mobile app, when you take a container photo, it should call:

```
POST https://www7-backend.kanzidata.com/api/vision/process-image
```

**Check in mobile app logs:**
- Is the request being sent?
- What's the response?
- Any network errors?

---

## Step 7: Common Issues & Solutions

### Issue 1: API Key Not Loaded in Docker

**Symptom:** Error: "ParkPow API key not configured"

**Solution:**
```bash
# Verify .env file exists in backend directory
cat /path/to/backend/.env | grep PARKPOW_API_KEY

# Restart container with .env file
docker-compose down
docker-compose up -d
```

### Issue 2: API Returns Empty Results

**Symptom:** Container number is blank

**Possible causes:**
- Photo quality is too low
- Container number not in frame
- Container number is dirty/obscured
- Lighting is poor

**Solution:**
- Test with a clear, well-lit photo
- Ensure container number is fully visible
- Try different angles

### Issue 3: API Returns 401/403 Error

**Symptom:** "ParkPow API Error: Unauthorized" or "Forbidden"

**Solution:**
- API key is invalid or expired
- Contact ParkPow support to verify account status
- Check if you have API credits remaining

### Issue 4: Network Timeout

**Symptom:** Request times out, no response

**Solution:**
```bash
# Check if container has internet access
docker exec kishkwambi-backend ping -c 3 8.8.8.8

# Check DNS resolution
docker exec kishkwambi-backend nslookup container-api.parkpow.com

# If failing, add DNS servers to docker-compose.yml:
services:
  backend:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

---

## Step 8: Test End-to-End

### From Mobile App:

1. Take a photo of a container with clear, visible container number
2. Wait for processing
3. Check if container number appears

### Check Backend Logs:

```bash
docker logs -f kishkwambi-backend | grep -E "ParkPow|📸|❌|✅"
```

**Expected output:**
```
📸 ParkPow API Response Status: 200
📸 ParkPow API Raw Response: { "results": [...] }
✅ Formatted Response: { "success": true, "data": { "containerNumber": "ABCD1234567", ... } }
```

---

## Step 9: Verify BACKEND_URL in Docker Container

The Docker container must have BACKEND_URL set for photo URLs:

```bash
# Check if BACKEND_URL is set
docker exec kishkwambi-backend env | grep BACKEND_URL

# Should show:
# BACKEND_URL=https://www7-backend.kanzidata.com

# If not, add to docker-compose.yml:
environment:
  - BACKEND_URL=https://www7-backend.kanzidata.com
```

**Then restart:**
```bash
docker-compose down
docker-compose up -d
```

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] ✅ Backend server is running: `curl https://www7-backend.kanzidata.com/health`
- [ ] ✅ PARKPOW_API_KEY is in backend/.env file
- [ ] ✅ Docker container has PARKPOW_API_KEY loaded: `docker exec ... env | grep PARKPOW`
- [ ] ✅ BACKEND_URL is set: `docker exec ... env | grep BACKEND_URL`
- [ ] ✅ Mobile app config.js uses production URL
- [ ] ✅ ParkPow API key is valid (test with curl)
- [ ] ✅ Docker container can reach internet
- [ ] ✅ Latest code is deployed with logging
- [ ] ✅ Photo is clear with visible container number

---

## How to Get ParkPow API Logs

Take a photo with the mobile app, then immediately check logs:

```bash
# Get last 50 lines
docker logs kishkwambi-backend --tail 50

# Or watch in real-time
docker logs -f kishkwambi-backend
```

Look for:
```
📸 ParkPow API Response Status: 200
📸 ParkPow API Raw Response: {...}
```

If you see the raw response, **copy it and share it** - I can help you debug the formatter.

---

## Still Not Working?

### Get Full Debug Output:

1. **Take a container photo in the app**
2. **Immediately run:**
   ```bash
   docker logs kishkwambi-backend --tail 100 > parkpow-debug.log
   ```
3. **Check the log file** for ParkPow API responses
4. **Share the response** to diagnose the formatter issue

### Manual Test:

Test the endpoint manually with a container photo:

```bash
# From your local machine
curl -X POST https://www7-backend.kanzidata.com/api/vision/process-image \
  -F "image=@/path/to/container/photo.jpg"

# Response should include:
{
  "success": true,
  "data": {
    "containerNumber": "ABCD1234567",
    "isoCode": "22G1",
    "containerNumberConfidence": 0.95,
    "isoCodeConfidence": 0.92
  }
}
```

---

## Most Likely Causes (in order):

1. **Docker container doesn't have updated code** (most common)
   - Solution: Rebuild and restart container

2. **PARKPOW_API_KEY not loaded in container**
   - Solution: Check `docker exec ... env | grep PARKPOW`

3. **Photo quality is poor**
   - Solution: Take clearer photos with good lighting

4. **API response format changed**
   - Solution: Check logs for raw response, update formatter

5. **Network issue from container**
   - Solution: Check container internet access

---

## Contact Support:

If still not working after these steps:
1. Check Docker logs during photo upload
2. Verify raw ParkPow API response
3. Test API key directly with curl
4. Check if PARKPOW_API_KEY is loaded in container

