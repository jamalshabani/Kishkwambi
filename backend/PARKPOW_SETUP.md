# ParkPow Container API Setup Guide

## 🚀 Quick Setup

### 1. Get Your ParkPow API Key
- Visit: https://container-api.parkpow.com/api/v1/docs/
- Sign up for an account
- Get your API token from the dashboard

### 2. Configure Environment Variables

Create or update your `.env` file in the backend directory:

```bash
# ParkPow Container API Configuration
PARKPOW_API_KEY=your-actual-parkpow-token-here

# MongoDB Configuration  
MONGODB_URI=mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/

# Server Configuration
PORT=3001
```

### 3. Replace the Placeholder
Replace `your-actual-parkpow-token-here` with your actual ParkPow API token.

### 4. Restart the Server
```bash
cd backend
npm run dev
```

## 🔧 API Usage

The ParkPow API expects:
- **Method**: POST
- **URL**: `https://container-api.parkpow.com/api/v1/predict/`
- **Headers**: `Authorization: Token your-token`
- **Body**: Multipart form data with image file

## 📊 Expected Response Format

ParkPow typically returns structured data like:
```json
{
  "container_number": "BSIU2253788",
  "iso_code": "22G1", 
  "color": "Blue",
  "color_hex": "#0000FF",
  "raw_text": "BSIU 225378 8\n22G1\nBlue Sky..."
}
```

## 🎯 Benefits Over Google Vision AI

1. **Specialized for Containers** - Purpose-built for container recognition
2. **Higher Accuracy** - Trained specifically on container data
3. **Structured Output** - Returns parsed container data directly
4. **Simpler Setup** - No Google Cloud billing/project configuration
5. **Better OCR** - Optimized for container text patterns

## 🧪 Testing

Test the API with curl:
```bash
curl -H "Authorization: Token your-token" \
     -F "image=@/path/to/container.jpg" \
     https://container-api.parkpow.com/api/v1/predict/
```

## 🚨 Troubleshooting

- **"ParkPow API key not configured"**: Check your `.env` file
- **401 Unauthorized**: Verify your API token
- **No container detected**: Try different image angles/lighting
- **Server won't start**: Ensure `.env` file has no spaces around `=`
