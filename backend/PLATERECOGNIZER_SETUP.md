# PlateRecognizer API Setup Guide

## 1. Get PlateRecognizer API Key

1. Go to [PlateRecognizer.com](https://platerecognizer.com/)
2. Sign up for an account
3. Go to your dashboard and get your API key
4. Choose the "Snapshot Cloud" plan for Tanzania licence plate recognition

## 2. Configure Environment Variables

Create a `.env` file in the backend directory with the following content:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/
PORT=3001

# Google Vision API Key
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here

# PlateRecognizer API Key
PLATERECOGNIZER_API_KEY=your_actual_platerecognizer_api_key_here

# ParkRow API Configuration
PARKROW_API_URL=https://api.parkrow.com/v1/ocr
PARKROW_API_KEY=your_parkrow_api_key_here
```

## 3. Replace the API Key

Replace `your_actual_platerecognizer_api_key_here` with your actual PlateRecognizer API key.

## 4. Test the Integration

Run the test script to verify the API is working:

```bash
cd backend
node test-platerecognizer.js
```

## 5. Tanzania Licence Plate Format

The API is configured to recognize Tanzania licence plates in the format:
- **T123ABC** (T + 3 digits + 3 letters)
- **T123AB** (T + 3 digits + 2 letters)

## 6. API Endpoints

- **Backend**: `POST /api/plate-recognizer/recognize`
- **Frontend**: Automatically called when trailer photo is taken
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "licencePlate": "T123ABC",
      "confidence": 0.95,
      "rawResponse": {...}
    }
  }
  ```

## 7. Troubleshooting

- **"API key not configured"**: Make sure `.env` file exists and contains `PLATERECOGNIZER_API_KEY`
- **"No licence plate detected"**: Check image quality and ensure licence plate is clearly visible
- **Network errors**: Verify internet connection and API key validity
