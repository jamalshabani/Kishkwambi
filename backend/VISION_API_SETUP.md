# Vision AI Setup Instructions

## Overview
This backend now supports Google Cloud Vision API for OCR (Optical Character Recognition) to extract container numbers, ISO codes, and colors from images.

## Setup Steps

### 1. Get Google Cloud Vision API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create API credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cd backend
touch .env
```

Add the following to your `.env` file:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/

# Server Configuration
PORT=3001

# Google Cloud Vision API Key
GOOGLE_VISION_API_KEY=YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with your actual Google Cloud Vision API key.

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start the Server

```bash
npm run dev
```

## API Endpoint

### POST `/api/vision/process-image`

Processes an image using Google Cloud Vision API to extract container information.

**Request Body:**
```json
{
  "base64Image": "base64_encoded_image_string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "containerNumber": "ABCD1234567",
    "isoCode": "45G1",
    "containerColor": "Blue",
    "rawText": "Full detected text from the image"
  }
}
```

## Pattern Recognition

The API extracts:
- **Container Number**: 4 letters followed by 7 digits (e.g., MSKU1234567)
- **ISO Code**: 2 digits, 1 letter, 1 digit (e.g., 45G1, 22G1)
- **Container Color**: Common colors (red, blue, green, yellow, white, grey, orange, brown, black)

## Troubleshooting

### Error: "Vision API key not configured"
- Make sure you've added `GOOGLE_VISION_API_KEY` to your `.env` file
- Restart the server after updating the `.env` file

### Error: "No text detected in image"
- The image quality might be too low
- Try taking a clearer photo
- Ensure the text is visible and not blurry

### Error: "Failed to process image"
- Check your internet connection
- Verify the API key is valid
- Check if you have exceeded the free tier quota

## Free Tier Limits

Google Cloud Vision API offers:
- **1,000 units/month** free
- Each TEXT_DETECTION request = 1 unit

After the free tier, costs are:
- $1.50 per 1,000 units

## Security Note

⚠️ **Never commit your `.env` file to version control!** 
The `.env` file is already in `.gitignore` to protect your API keys.

