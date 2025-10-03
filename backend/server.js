const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const { formatParkRowResponse, formatGoogleVisionResponse } = require('./utils/parkrowFormatter');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/';
const DB_NAME = 'test';
const COLLECTION_NAME = 'users';

let db;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
async function connectToDatabase() {
    try {
        const client = new MongoClient(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        await client.connect();
        db = client.db(DB_NAME);
    } catch (error) {
        process.exit(1);
    }
}

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        if (!db) {
            throw new Error('Database not connected');
        }

        const collection = db.collection(COLLECTION_NAME);
        const users = await collection.find({}).toArray();

        res.json({
            success: true,
            count: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Authenticate user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        const collection = db.collection(COLLECTION_NAME);
        const user = await collection.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        if (user.isActive !== 'Yes') {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Compare password with hashed password
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid password'
            });
        }

        // Return user data (without password)
        const userData = {
            id: user._id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            permissions: user.permissions || [],
            phone: user.phone
        };

        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get connection status
app.get('/api/status', async (req, res) => {
    try {
        if (!db) {
            throw new Error('Database not connected');
        }

        await db.admin().ping();

        res.json({
            connected: true,
            message: 'Database connected successfully'
        });
    } catch (error) {
        res.status(500).json({
            connected: false,
            message: `Database connection failed: ${error.message}`
        });
    }
});

// Vision AI endpoint for OCR
app.post('/api/vision/process-image', async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({
                success: false,
                error: 'Base64 image is required'
            });
        }

        // ParkPow Container API key from environment variable
        const PARKPOW_API_KEY = process.env.PARKPOW_API_KEY;
        
        if (!PARKPOW_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'ParkPow API key not configured. Please set PARKPOW_API_KEY in your environment variables.'
            });
        }

        console.log('=== SENDING TO PARKPOW API ===');
        console.log('API Key configured:', !!PARKPOW_API_KEY);
        
        // Convert base64 to buffer for multipart form data
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Create FormData for ParkPow API
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'container.jpg',
            contentType: 'image/jpeg'
        });

        const fetch = require('node-fetch');
        const response = await fetch('https://container-api.parkpow.com/api/v1/predict/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${PARKPOW_API_KEY}`,
                ...form.getHeaders()
            },
            body: form
        });

        const data = await response.json();
        
        console.log('=== PARKPOW API RESPONSE ===');
        console.log(JSON.stringify(data, null, 2));
        console.log('===========================');
        
        // Check for API errors
        if (!response.ok) {
            console.log('=== PARKPOW API ERROR ===');
            console.log('Status:', response.status);
            console.log('Response:', data);
            console.log('========================');
            
            return res.status(500).json({
                success: false,
                error: `ParkPow API Error: ${data.error || data.message || 'Unknown error'}`,
                status: response.status
            });
        }

        // Use utility function to format ParkRow response
        const formattedResponse = formatParkRowResponse(data);
        
        console.log('=== EXTRACTED INFO ===');
        console.log('Container Number:', formattedResponse.data.containerNumber || 'NOT FOUND');
        console.log('ISO Code:', formattedResponse.data.isoCode || 'NOT FOUND');
        console.log('=====================');

        // Return formatted response with only required fields
        res.json(formattedResponse);

    } catch (error) {
        console.error('ParkPow API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process image with ParkPow API'
        });
    }
});

// Google Vision AI endpoint with color detection
app.post('/api/vision/google-vision-color', async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({
                success: false,
                error: 'Base64 image is required'
            });
        }

        // Google Cloud Vision API key from environment variable
        const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
        
        if (!VISION_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Vision API key not configured'
            });
        }

        const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
        
        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Image,
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 1,
                        },
                        {
                            type: 'IMAGE_PROPERTIES',
                            maxResults: 1,
                        },
                    ],
                },
            ],
        };

        const fetch = require('node-fetch');
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        
        console.log('=== GOOGLE VISION API RESPONSE ===');
        console.log(JSON.stringify(data, null, 2));
        console.log('=== RESPONSE STRUCTURE ===');
        console.log('Has responses?', !!data.responses);
        console.log('First response?', !!data.responses?.[0]);
        console.log('Has textAnnotations?', !!data.responses?.[0]?.textAnnotations);
        console.log('Has error?', !!data.responses?.[0]?.error);
        
        // Check for API-level errors
        if (data.error) {
            console.log('=== GOOGLE API ERROR ===');
            console.log('Code:', data.error.code);
            console.log('Message:', data.error.message);
            console.log('Status:', data.error.status);
            console.log('========================');
            
            return res.status(500).json({
                success: false,
                error: `Google Vision API Error: ${data.error.message}`,
                code: data.error.code
            });
        }
        
        if (data.responses && data.responses[0].textAnnotations) {
            const detectedText = data.responses[0].textAnnotations[0].description;
            
            console.log('=== ALL DETECTED TEXT ===');
            console.log(detectedText);
            console.log('========================');
            
            // Extract container information
            // Pattern: 4 letters + 6 or 7 digits (with optional spaces and check digit)
            const containerPattern = /[A-Z]{4}\s*\d{6,7}\s*\d?/g;
            const containerMatch = detectedText.match(containerPattern);
            let containerNumber = '';
            if (containerMatch) {
                // Remove all spaces and take first match
                containerNumber = containerMatch[0].replace(/\s/g, '');
                // Ensure it's 11 characters (4 letters + 7 digits)
                if (containerNumber.length < 11) {
                    // Pad with spaces if needed
                    containerNumber = containerNumber.padEnd(11, '');
            }
        }

            // ISO Code extraction with OCR error correction
            let isoCode = '';
            
            // First, try to match the correct pattern: 2 digits + letter + digit
            const isoPattern = /\b\d{2}[A-Z]\d\b/g;
            const isoMatch = detectedText.match(isoPattern);
            
            if (isoMatch) {
                isoCode = isoMatch[0];
            } else {
                // If no match, look for 4 consecutive digits (common OCR error)
                const fourDigitsPattern = /\b\d{4}\b/g;
                const fourDigitsMatch = detectedText.match(fourDigitsPattern);
                
                if (fourDigitsMatch) {
                    // Common OCR confusions for letters in ISO codes
                    const digitToLetter = {
                        '0': 'O',
                        '1': 'I',
                        '5': 'S',
                        '6': 'G',
                        '8': 'B'
                    };
                    
                    // Try each 4-digit match
                    for (const candidate of fourDigitsMatch) {
                        // ISO code format: 2 digits + letter + digit
                        // So the 3rd character (index 2) should be a letter
                        const digits = candidate.split('');
                        const thirdChar = digits[2];
                        
                        // If third character is a commonly confused digit, replace it
                        if (digitToLetter[thirdChar]) {
                            digits[2] = digitToLetter[thirdChar];
                            isoCode = digits.join('');
                            console.log(`OCR Correction: ${candidate} -> ${isoCode} (replaced ${thirdChar} with ${digitToLetter[thirdChar]})`);
                            break;
                        }
                    }
                }
            }

            // Extract color from text (fallback method)
            const colors = ['red', 'blue', 'green', 'yellow', 'white', 'grey', 'gray', 'orange', 'brown', 'black', 'silver'];
            const textLower = detectedText.toLowerCase();
            let containerColorFromText = '';
            for (const color of colors) {
                if (textLower.includes(color)) {
                    containerColorFromText = color.charAt(0).toUpperCase() + color.slice(1);
                    break;
                }
            }

            // Helper function to convert RGB to Hex
            const rgbToHex = (r, g, b) => {
                return '#' + [r, g, b].map(x => {
                    const hex = Math.round(x).toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');
            };

            // Enhanced color detection function
            const getColorName = (r, g, b) => {
                // Comprehensive color reference database
                const colorDatabase = [
                    { name: 'Red', rgb: [255, 0, 0], tolerance: 50 },
                    { name: 'Blue', rgb: [0, 0, 255], tolerance: 50 },
                    { name: 'Green', rgb: [0, 255, 0], tolerance: 50 },
                    { name: 'Yellow', rgb: [255, 255, 0], tolerance: 50 },
                    { name: 'Orange', rgb: [255, 165, 0], tolerance: 50 },
                    { name: 'Purple', rgb: [128, 0, 128], tolerance: 50 },
                    { name: 'Pink', rgb: [255, 192, 203], tolerance: 50 },
                    { name: 'Brown', rgb: [165, 42, 42], tolerance: 50 },
                    { name: 'Gray', rgb: [128, 128, 128], tolerance: 50 },
                    { name: 'Black', rgb: [0, 0, 0], tolerance: 30 },
                    { name: 'White', rgb: [255, 255, 255], tolerance: 30 },
                    { name: 'Silver', rgb: [192, 192, 192], tolerance: 40 },
                    { name: 'Gold', rgb: [255, 215, 0], tolerance: 50 },
                    { name: 'Cyan', rgb: [0, 255, 255], tolerance: 50 },
                    { name: 'Magenta', rgb: [255, 0, 255], tolerance: 50 },
                    { name: 'Lime', rgb: [0, 255, 0], tolerance: 50 },
                    { name: 'Navy', rgb: [0, 0, 128], tolerance: 40 },
                    { name: 'Maroon', rgb: [128, 0, 0], tolerance: 40 },
                    { name: 'Olive', rgb: [128, 128, 0], tolerance: 40 },
                    { name: 'Teal', rgb: [0, 128, 128], tolerance: 40 }
                ];

                // Calculate Euclidean distance between colors
                const calculateDistance = (color1, color2) => {
                    return Math.sqrt(
                        Math.pow(color1[0] - color2[0], 2) +
                        Math.pow(color1[1] - color2[1], 2) +
                        Math.pow(color1[2] - color2[2], 2)
                    );
                };

                // Find the closest color match
                let closestColor = null;
                let minDistance = Infinity;

                for (const color of colorDatabase) {
                    const distance = calculateDistance([r, g, b], color.rgb);
                    if (distance < minDistance && distance <= color.tolerance) {
                        minDistance = distance;
                        closestColor = color.name;
                    }
                }

                // If no close match found, use basic color detection
                if (!closestColor) {
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    
                    // Check for grayscale
                    if (max - min < 30) {
                        if (max > 200) return 'White';
                        if (max < 80) return 'Black';
                        return 'Gray';
                    }
                    
                    // Check dominant color
                    if (r > g && r > b) {
                        if (g > 100 && b < 100) return 'Orange';
                        if (r > 150 && g < 100 && b < 100) return 'Red';
                        return 'Brown';
                    }
                    if (g > r && g > b) return 'Green';
                    if (b > r && b > g) {
                        if (g > 100) return 'Cyan';
                        return 'Blue';
                    }
                    if (r > 150 && g > 150 && b < 100) return 'Yellow';
                    
                    return 'Unknown';
                }

                return closestColor;
            };

            // Extract dominant color from image properties
            let dominantColor = null;
            let dominantColorHex = '';
            let dominantColorName = '';

            if (data.responses[0].imagePropertiesAnnotation) {
                const imageProps = data.responses[0].imagePropertiesAnnotation;
                console.log('=== IMAGE PROPERTIES ===');
                console.log(JSON.stringify(imageProps.dominantColors, null, 2));
                
                if (imageProps.dominantColors && imageProps.dominantColors.colors && imageProps.dominantColors.colors.length > 0) {
                    // Get the most dominant color
                    dominantColor = imageProps.dominantColors.colors[0];
                    const rgb = dominantColor.color;
                    dominantColorHex = rgbToHex(rgb.red || 0, rgb.green || 0, rgb.blue || 0);
                    dominantColorName = getColorName(rgb.red || 0, rgb.green || 0, rgb.blue || 0);
                    
                    console.log('Dominant Color RGB:', rgb);
                    console.log('Dominant Color Hex:', dominantColorHex);
                    console.log('Dominant Color Name:', dominantColorName);
                    console.log('Color Score:', dominantColor.score);
                    console.log('Pixel Fraction:', dominantColor.pixelFraction);
                }
                console.log('========================');
            }

            // Use image-detected color, fallback to text-detected color
            const finalColorName = dominantColorName || containerColorFromText;

        console.log('=== EXTRACTED INFO ===');
        console.log('Container Number:', containerNumber || 'NOT FOUND');
        console.log('ISO Code:', isoCode || 'NOT FOUND');
            console.log('Color (from text):', containerColorFromText || 'NOT FOUND');
            console.log('Color (from image):', dominantColorName || 'NOT FOUND');
            console.log('Color Hex:', dominantColorHex || 'NOT FOUND');
        console.log('=====================');

        res.json({
            success: true,
            data: {
                containerNumber,
                isoCode,
                    containerColor: finalColorName,
                    colorHex: dominantColorHex,
                    colorDetails: dominantColor ? {
                        rgb: dominantColor.color,
                        hex: dominantColorHex,
                        name: dominantColorName,
                        score: dominantColor.score,
                        pixelFraction: dominantColor.pixelFraction
                    } : null,
                    rawText: detectedText
                }
            });
        } else {
            console.log('=== NO TEXT DETECTED ===');
            console.log('Vision API returned no text annotations');
            console.log('========================');
            
            res.json({
                success: false,
                error: 'No text detected in image'
            });
        }
    } catch (error) {
        console.error('Vision API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process image'
        });
    }
});

// Container number validation endpoint
app.post('/api/validate-container', async (req, res) => {
    try {
        const { containerNumber } = req.body;
        
        console.log('🔍 Received container number:', containerNumber);

        if (!containerNumber) {
            return res.status(400).json({
                success: false,
                error: 'Container number is required'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Check if container number exists in tripsegments collection
        const tripsegmentsCollection = db.collection('tripsegments');
        const trimmedContainerNumber = containerNumber.trim();
        
        // Try exact match first
        let existingContainer = await tripsegmentsCollection.findOne({ 
            containerNumber: trimmedContainerNumber 
        });
        
        // If not found, try without spaces (common OCR issue)
        if (!existingContainer) {
            const containerWithoutSpaces = trimmedContainerNumber.replace(/\s/g, '');
            existingContainer = await tripsegmentsCollection.findOne({ 
                containerNumber: containerWithoutSpaces 
            });
        }

        if (existingContainer) {
            console.log(`✅ Container number ${containerNumber} found in database`);
            console.log('📊 Available fields in database document:', Object.keys(existingContainer));
            console.log('📊 Trip segment fields:', {
                tripSegmentNumber: existingContainer.tripSegmentNumber,
                tripSegment: existingContainer.tripSegment
            });
            res.json({
                success: true,
                exists: true,
                message: `Container number ${containerNumber} exists in the database`,
                containerData: {
                    containerNumber: existingContainer.containerNumber,
                    tripSegmentNumber: existingContainer.tripSegmentNumber || existingContainer.tripSegment || 'N/A',
                    // Add other relevant fields as needed
                }
            });
        } else {
            console.log(`❌ Container number ${containerNumber} not found in database`);
            res.json({
                success: true,
                exists: false,
                message: `Container number ${containerNumber} does not exist in the database`
            });
        }

    } catch (error) {
        console.error('Container validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to validate container number'
        });
    }
});

// Update container information endpoint
app.post('/api/update-container-info', async (req, res) => {
    try {
        const { 
            containerNumber, 
            isoCode, 
            containerType, 
            containerColor, 
            containerColorCode, 
            containerSize, 
            inspectorName, 
            inspectionDate 
        } = req.body;
        
        console.log('📝 Received container update request:', {
            containerNumber,
            isoCode,
            containerType,
            containerColor,
            containerColorCode,
            containerSize,
            inspectorName,
            inspectionDate
        });

        if (!containerNumber) {
            return res.status(400).json({
                success: false,
                error: 'Container number is required'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        const collection = db.collection('tripsegments'); // Use same collection as validate-container
        const trimmedContainerNumber = containerNumber.trim();
        
        // Try exact match first, then without spaces (same logic as validate-container)
        let updateResult = await collection.updateOne(
            { containerNumber: trimmedContainerNumber },
            {
                $set: {
                    isoCode: isoCode || null,
                    containerType: containerType || null,
                    containerColor: containerColor || null,
                    containerColorCode: containerColorCode || null,
                    containerSize: containerSize || null,
                    inspectorName: inspectorName || null,
                    inspectionDate: inspectionDate || new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false } // Don't create if doesn't exist
        );

        // If not found with exact match, try without spaces (common OCR issue)
        if (updateResult.matchedCount === 0) {
            const containerWithoutSpaces = trimmedContainerNumber.replace(/\s/g, '');
            updateResult = await collection.updateOne(
                { containerNumber: containerWithoutSpaces },
                {
                    $set: {
                        isoCode: isoCode || null,
                        containerType: containerType || null,
                        containerColor: containerColor || null,
                        containerColorCode: containerColorCode || null,
                        containerSize: containerSize || null,
                        inspectorName: inspectorName || null,
                        inspectionDate: inspectionDate || new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    }
                },
                { upsert: false } // Don't create if doesn't exist
            );
        }

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Container number ${containerNumber} not found for update`);
            return res.status(404).json({
                success: false,
                error: `Container number ${containerNumber} not found in database`
            });
        }

        if (updateResult.modifiedCount > 0) {
            console.log(`✅ Container number ${containerNumber} updated successfully`);
            res.json({
                success: true,
                message: `Container number ${containerNumber} updated successfully`,
                modifiedCount: updateResult.modifiedCount
            });
        } else {
            console.log(`ℹ️ Container number ${containerNumber} found but no changes made`);
            res.json({
                success: true,
                message: `Container number ${containerNumber} found but no changes were made`,
                modifiedCount: updateResult.modifiedCount
            });
        }

    } catch (error) {
        console.error('Container update error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update container information'
        });
    }
});

// Google Vision AI endpoint for OCR comparison
app.post('/api/vision/google-vision', async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({
                success: false,
                error: 'Base64 image is required'
            });
        }

        // Google Cloud Vision API key from environment variable
        const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
        
        if (!VISION_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Vision API key not configured'
            });
        }

        const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
        
        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Image,
                    },
                            features: [
                                {
                                    type: 'TEXT_DETECTION',
                                    maxResults: 1,
                                },
                            ],
                },
            ],
        };

        const fetch = require('node-fetch');
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        
        console.log('=== VISION API RESPONSE ===');
        console.log(JSON.stringify(data, null, 2));
        console.log('=== RESPONSE STRUCTURE ===');
        console.log('Has responses?', !!data.responses);
        console.log('First response?', !!data.responses?.[0]);
        console.log('Has textAnnotations?', !!data.responses?.[0]?.textAnnotations);
        console.log('Has error?', !!data.responses?.[0]?.error);
        
        // Check for API-level errors
        if (data.error) {
            console.log('=== GOOGLE API ERROR ===');
            console.log('Code:', data.error.code);
            console.log('Message:', data.error.message);
            console.log('Status:', data.error.status);
            console.log('========================');
            
            return res.status(500).json({
                success: false,
                error: `Google Vision API Error: ${data.error.message}`,
                code: data.error.code
            });
        }
        
        if (data.responses && data.responses[0].textAnnotations) {
            const detectedText = data.responses[0].textAnnotations[0].description;
            
            console.log('=== ALL DETECTED TEXT ===');
            console.log(detectedText);
            console.log('========================');
            
            // Extract container information
            // Pattern: 4 letters + 6 or 7 digits (with optional spaces and check digit)
            const containerPattern = /[A-Z]{4}\s*\d{6,7}\s*\d?/g;
            const containerMatch = detectedText.match(containerPattern);
            let containerNumber = '';
            if (containerMatch) {
                // Remove all spaces and take first match
                containerNumber = containerMatch[0].replace(/\s/g, '');
                // Ensure it's 11 characters (4 letters + 7 digits)
                if (containerNumber.length < 11) {
                    // Pad with spaces if needed
                    containerNumber = containerNumber.padEnd(11, '');
                }
            }

            // ISO Code extraction with OCR error correction
            let isoCode = '';
            
            // First, try to match the correct pattern: 2 digits + letter + digit
            const isoPattern = /\b\d{2}[A-Z]\d\b/g;
            const isoMatch = detectedText.match(isoPattern);
            
            if (isoMatch) {
                isoCode = isoMatch[0];
            } else {
                // If no match, look for 4 consecutive digits (common OCR error)
                const fourDigitsPattern = /\b\d{4}\b/g;
                const fourDigitsMatch = detectedText.match(fourDigitsPattern);
                
                if (fourDigitsMatch) {
                    // Common OCR confusions for letters in ISO codes
                    const digitToLetter = {
                        '0': 'O',
                        '1': 'I',
                        '5': 'S',
                        '6': 'G',
                        '8': 'B'
                    };
                    
                    // Try each 4-digit match
                    for (const candidate of fourDigitsMatch) {
                        // ISO code format: 2 digits + letter + digit
                        // So the 3rd character (index 2) should be a letter
                        const digits = candidate.split('');
                        const thirdChar = digits[2];
                        
                        // If third character is a commonly confused digit, replace it
                        if (digitToLetter[thirdChar]) {
                            digits[2] = digitToLetter[thirdChar];
                            isoCode = digits.join('');
                            console.log(`OCR Correction: ${candidate} -> ${isoCode} (replaced ${thirdChar} with ${digitToLetter[thirdChar]})`);
                            break;
                        }
                    }
                }
            }


            console.log('=== EXTRACTED INFO ===');
            console.log('Container Number:', containerNumber || 'NOT FOUND');
            console.log('ISO Code:', isoCode || 'NOT FOUND');
            console.log('=====================');

            // Use the formatter utility to get consistent response format with confidence scores
            const formattedResponse = formatGoogleVisionResponse(detectedText);
            
            // Add rawText to the formatted response
            formattedResponse.data.rawText = detectedText;
            
            res.json(formattedResponse);
        } else {
            console.log('=== NO TEXT DETECTED ===');
            console.log('Vision API returned no text annotations');
            console.log('========================');
            
            res.json({
                success: false,
                error: 'No text detected in image'
            });
        }
    } catch (error) {
        console.error('Vision API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process image'
        });
    }
});


// Start server
async function startServer() {
    // PlateRecognizer API endpoint for trailer licence plate recognition
    app.post('/api/plate-recognizer/recognize', async (req, res) => {
        try {
            const { base64Image } = req.body;
            
            console.log('🚗 Received trailer photo for plate recognition');

            if (!base64Image) {
                return res.status(400).json({
                    success: false,
                    error: 'Base64 image is required'
                });
            }

            // PlateRecognizer Snapshot Cloud API
            const PLATERECOGNIZER_API_KEY = process.env.PLATERECOGNIZER_API_KEY;
            if (!PLATERECOGNIZER_API_KEY) {
                console.log('❌ PlateRecognizer API key not found in environment variables');
                console.log('📝 Please add PLATERECOGNIZER_API_KEY to your .env file');
                console.log('📖 See PLATERECOGNIZER_SETUP.md for setup instructions');
                return res.status(500).json({
                    success: false,
                    error: 'PlateRecognizer API key not configured. Please add PLATERECOGNIZER_API_KEY to your .env file. See PLATERECOGNIZER_SETUP.md for setup instructions.'
                });
            }

            const PLATERECOGNIZER_URL = 'https://api.platerecognizer.com/v1/plate-reader/';
            
            // Convert base64 to buffer for multipart form data
            const imageBuffer = Buffer.from(base64Image, 'base64');
            
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('upload', imageBuffer, {
                filename: 'trailer_photo.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('regions', 'tz'); // Tanzania region
            formData.append('config', JSON.stringify({
                "regions": ["tz"],
                "detect_vehicle": false,
                "detect_plate": true,
                "detect_region": false
            }));

            const fetch = require('node-fetch');
            const response = await fetch(PLATERECOGNIZER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${PLATERECOGNIZER_API_KEY}`,
                    ...formData.getHeaders()
                },
                body: formData,
            });

            const data = await response.json();
            
            console.log('=== PLATERECOGNIZER API RESPONSE ===');
            console.log(JSON.stringify(data, null, 2));

            if (data.results && data.results.length > 0) {
                const plateResult = data.results[0];
                const plateNumber = plateResult.plate.toUpperCase(); // Convert to uppercase
                const confidence = plateResult.score; // Use 'score' instead of 'confidence'
                
                console.log(`✅ Detected plate: ${plateNumber} (confidence: ${confidence})`);
                
                res.json({
                    success: true,
                    data: {
                        licencePlate: plateNumber,
                        confidence: confidence,
                        rawResponse: data
                    }
                });
            } else {
                console.log('❌ No licence plate detected');
                res.json({
                    success: true,
                    data: {
                        licencePlate: '',
                        confidence: 0,
                        rawResponse: data
                    }
                });
            }

        } catch (error) {
            console.error('PlateRecognizer API error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to recognize licence plate'
            });
        }
    });

    await connectToDatabase();

    app.listen(PORT, '0.0.0.0', () => {
        // Server started
    });
}

startServer().catch(() => process.exit(1));
