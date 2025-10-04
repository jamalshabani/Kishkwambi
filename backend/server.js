const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();
const { formatParkRowResponse, formatGoogleVisionResponse } = require('./utils/parkrowFormatter');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/';
const DB_NAME = 'test';
const COLLECTION_NAME = 'users';

let db;

// AWS S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'simba-terminal-photos';

// Shared directory configuration
const SHARED_ASSETS_DIR = path.join(__dirname, '..', '..', 'shared-assets');
const ARRIVED_CONTAINERS_DIR = path.join(SHARED_ASSETS_DIR, 'arrivedContainers');

// Ensure shared directories exist
async function ensureSharedDirectories() {
    try {
        await fs.mkdir(SHARED_ASSETS_DIR, { recursive: true });
        await fs.mkdir(ARRIVED_CONTAINERS_DIR, { recursive: true });
        console.log('✅ Shared directories created/verified');
    } catch (error) {
        console.error('❌ Error creating shared directories:', error);
    }
}

// S3 Upload Utility Functions
async function uploadToS3(file, key, contentType = 'image/jpeg') {
    try {
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: contentType,
            // Remove ACL since bucket doesn't allow ACLs
            // Files will be accessible via bucket policy instead
        });

        const result = await s3Client.send(command);
        const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        
        console.log(`✅ File uploaded to S3: ${key}`);
        return { success: true, url: publicUrl, key: key };
    } catch (error) {
        console.error('❌ S3 upload error:', error);
        return { success: false, error: error.message };
    }
}

async function deleteFromS3(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`✅ File deleted from S3: ${key}`);
        return { success: true };
    } catch (error) {
        console.error('❌ S3 delete error:', error);
        return { success: false, error: error.message };
    }
}

// Configure multer for file uploads
// Use memory storage for S3 uploads (gets file buffer)
const memoryStorage = multer.memoryStorage();

// Use disk storage for local uploads (legacy)
const diskStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const tripSegmentNumber = req.body.tripSegmentNumber || 'unknown';
        const uploadPath = path.join(ARRIVED_CONTAINERS_DIR, tripSegmentNumber);
        
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const fileExtension = path.extname(file.originalname);
        const filename = `${file.fieldname}_${timestamp}${fileExtension}`;
        cb(null, filename);
    }
});

// S3 upload middleware (memory storage)
const uploadS3 = multer({ 
    storage: memoryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
        }
    }
});

// Local upload middleware (disk storage)
const upload = multer({ 
    storage: diskStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
        }
    }
});

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


// S3 Upload endpoint for damage photos
app.post('/api/upload/s3-damage-photos', uploadS3.array('photos', 10), async (req, res) => {
    try {
        const { tripSegmentNumber, containerNumber } = req.body;
        
        console.log('📸 Received S3 damage photo upload:', {
            tripSegmentNumber,
            containerNumber,
            fileCount: req.files?.length || 0
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload files to S3 and create damage photo objects
        const uploadedFiles = [];
        const damagePhotoObjects = [];
        
        for (const file of req.files) {
            // Create S3 key: damage-photos/tripSegmentNumber/filename
            const timestamp = Date.now();
            const fileExtension = path.extname(file.originalname);
            const filename = `damage_${timestamp}${fileExtension}`;
            const s3Key = `damage-photos/${tripSegmentNumber}/${filename}`;
            
            console.log('📸 File details:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.buffer ? file.buffer.length : 'no buffer',
                filename: filename,
                s3Key: s3Key
            });
            
            // Upload to S3
            const uploadResult = await uploadToS3(file, s3Key, file.mimetype);
            
            if (uploadResult.success) {
                uploadedFiles.push(s3Key);
                
                // Create damage photo object matching the schema
                const damagePhotoObject = {
                    damageLocation: req.body.damageLocation || 'Unknown', // You can pass this from the frontend
                    damagePhotoPath: uploadResult.url, // S3 URL
                    damagePhotoSize: file.size || 0 // File size in bytes
                };
                
                damagePhotoObjects.push(damagePhotoObject);
                console.log(`✅ Damage photo uploaded to S3: ${s3Key}`);
            } else {
                console.error(`❌ Failed to upload ${file.filename}:`, uploadResult.error);
            }
        }

        if (uploadedFiles.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to upload any files to S3'
            });
        }

        // Update TripSegment document with damage photo objects
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $push: {
                    damagePhotos: { $each: damagePhotoObjects }
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with ${damagePhotoObjects.length} damage photos`);

        res.json({
            success: true,
            message: `Successfully uploaded ${damagePhotoObjects.length} damage photos to S3`,
            uploadedFiles: uploadedFiles,
            damagePhotos: damagePhotoObjects,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 damage photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload damage photos to S3'
        });
    }
});

// S3 Upload endpoint for container photos
app.post('/api/upload/s3-container-photos', uploadS3.array('photos', 10), async (req, res) => {
    try {
        const { tripSegmentNumber, containerNumber, photoType } = req.body;
        
        console.log('📸 Received S3 container photo upload:', {
            tripSegmentNumber,
            containerNumber,
            photoType,
            fileCount: req.files?.length || 0
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload files to S3 and create container photo objects
        const uploadedFiles = [];
        const containerPhotoObjects = [];
        
        for (const file of req.files) {
            // Create S3 key: container-photos/tripSegmentNumber/filename
            const timestamp = Date.now();
            const fileExtension = path.extname(file.originalname);
            const filename = `container_${timestamp}${fileExtension}`;
            const s3Key = `container-photos/${tripSegmentNumber}/${filename}`;
            
            console.log('📸 File details:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.buffer ? file.buffer.length : 'no buffer',
                filename: filename,
                s3Key: s3Key
            });
            
            // Upload to S3
            const uploadResult = await uploadToS3(file, s3Key, file.mimetype);
            
            if (uploadResult.success) {
                uploadedFiles.push(s3Key);
                
                // Create container photo object matching the schema
                const containerPhotoObject = {
                    containerPhotoLocation: req.body.containerPhotoLocation || 'Container Back Wall',
                    containerPhotoPath: uploadResult.url, // S3 URL
                    containerPhotoSize: file.size || 0 // File size in bytes
                };
                
                containerPhotoObjects.push(containerPhotoObject);
                console.log(`✅ Container photo uploaded to S3: ${s3Key}`);
            } else {
                console.error(`❌ Failed to upload ${file.filename}:`, uploadResult.error);
            }
        }

        if (uploadedFiles.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to upload any files to S3'
            });
        }

        // Update TripSegment document with container photo objects
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $push: {
                    containerPhotos: { $each: containerPhotoObjects }
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with ${containerPhotoObjects.length} container photos`);

        res.json({
            success: true,
            message: `Successfully uploaded ${containerPhotoObjects.length} container photos to S3`,
            uploadedFiles: uploadedFiles,
            containerPhotos: containerPhotoObjects,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 container photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload container photos to S3'
        });
    }
});

// Update damage status endpoint
app.post('/api/update-damage-status', async (req, res) => {
    try {
        const { tripSegmentNumber, hasDamages, damageLocation } = req.body;
        
        console.log('🔧 Received damage status update:', {
            tripSegmentNumber,
            hasDamages,
            damageLocation
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        const collection = db.collection('tripsegments');
        
        // Prepare update data with atomic operators
        const updateData = {
            $set: {
                hasDamages: hasDamages || null,
                lastUpdated: new Date().toISOString()
            }
        };

        // If damage location is provided, add it to the array
        if (damageLocation) {
            updateData.$addToSet = {
                damageLocations: damageLocation
            };
        }

        const updateResult = await collection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            updateData,
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} damage status`);

        res.json({
            success: true,
            message: 'Damage status updated successfully',
            tripSegmentNumber: tripSegmentNumber,
            hasDamages: hasDamages,
            damageLocation: damageLocation
        });

    } catch (error) {
        console.error('❌ Damage status update error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update damage status'
        });
    }
});

// Update container load status endpoint
app.post('/api/update-container-load-status', async (req, res) => {
    try {
        const { tripSegmentNumber, containerLoadStatus } = req.body;
        
        console.log('🔧 Received container load status update:', {
            tripSegmentNumber,
            containerLoadStatus
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!containerLoadStatus) {
            return res.status(400).json({
                success: false,
                error: 'Container load status is required'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        const collection = db.collection('tripsegments');
        
        const updateResult = await collection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    containerLoadStatus: containerLoadStatus,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} container load status to ${containerLoadStatus}`);

        res.json({
            success: true,
            message: 'Container load status updated successfully',
            tripSegmentNumber: tripSegmentNumber,
            containerLoadStatus: containerLoadStatus
        });

    } catch (error) {
        console.error('❌ Container load status update error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update container load status'
        });
    }
});

// S3 Upload endpoint for trailer photo
app.post('/api/upload/s3-trailer-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received S3 trailer photo upload:', {
            tripSegmentNumber,
            photoType,
            hasFile: !!req.file
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload file to S3
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const filename = `trailer_${timestamp}${fileExtension}`;
        const s3Key = `trailer-photos/${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to S3
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload trailer photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload trailer photo to S3'
            });
        }

        console.log(`✅ Trailer photo uploaded to S3: ${s3Key}`);

        // Update TripSegment document with trailer photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    trailerPhoto: uploadResult.url,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with trailer photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded trailer photo to S3',
            trailerPhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 trailer photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload trailer photo to S3'
        });
    }
});

// S3 Upload endpoint for front wall photo
app.post('/api/upload/s3-front-wall-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received S3 front wall photo upload:', {
            tripSegmentNumber,
            photoType,
            hasFile: !!req.file
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload file to S3
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const filename = `front_wall_${timestamp}${fileExtension}`;
        const s3Key = `front-wall-photos/${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to S3
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload front wall photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload front wall photo to S3'
            });
        }

        console.log(`✅ Front wall photo uploaded to S3: ${s3Key}`);

        // Update TripSegment document with front wall photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    frontWallPhoto: uploadResult.url,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with front wall photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded front wall photo to S3',
            frontWallPhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 front wall photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload front wall photo to S3'
        });
    }
});

// S3 Upload endpoint for truck photo
app.post('/api/upload/s3-truck-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received S3 truck photo upload:', {
            tripSegmentNumber,
            photoType,
            hasFile: !!req.file
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload file to S3
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const filename = `truck_${timestamp}${fileExtension}`;
        const s3Key = `truck-photos/${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to S3
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload truck photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload truck photo to S3'
            });
        }

        console.log(`✅ Truck photo uploaded to S3: ${s3Key}`);

        // Update TripSegment document with truck photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    truckPhoto: uploadResult.url,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with truck photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded truck photo to S3',
            truckPhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 truck photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload truck photo to S3'
        });
    }
});

// S3 Upload endpoint for left side photo
app.post('/api/upload/s3-left-side-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received S3 left side photo upload:', {
            tripSegmentNumber,
            photoType,
            hasFile: !!req.file
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload file to S3
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const filename = `left_side_${timestamp}${fileExtension}`;
        const s3Key = `left-side-photos/${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to S3
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload left side photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload left side photo to S3'
            });
        }

        console.log(`✅ Left side photo uploaded to S3: ${s3Key}`);

        // Update TripSegment document with left side photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    leftSidePhoto: uploadResult.url,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with left side photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded left side photo to S3',
            leftSidePhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 left side photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload left side photo to S3'
        });
    }
});

// S3 Upload endpoint for inside photo
app.post('/api/upload/s3-inside-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received S3 inside photo upload:', {
            tripSegmentNumber,
            photoType,
            hasFile: !!req.file
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload file to S3
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const filename = `inside_${timestamp}${fileExtension}`;
        const s3Key = `inside-photos/${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to S3
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload inside photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload inside photo to S3'
            });
        }

        console.log(`✅ Inside photo uploaded to S3: ${s3Key}`);

        // Update TripSegment document with inside photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    insidePhoto: uploadResult.url,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with inside photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded inside photo to S3',
            insidePhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 inside photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload inside photo to S3'
        });
    }
});

// S3 Upload endpoint for driver photo
app.post('/api/upload/s3-driver-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received S3 driver photo upload:', {
            tripSegmentNumber,
            photoType,
            hasFile: !!req.file
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Upload file to S3
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const filename = `driver_${timestamp}${fileExtension}`;
        const s3Key = `driver-photos/${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to S3
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload driver photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload driver photo to S3'
            });
        }

        console.log(`✅ Driver photo uploaded to S3: ${s3Key}`);

        // Update TripSegment document with driver photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    driverPhoto: uploadResult.url,
                    lastUpdated: new Date().toISOString()
                }
            },
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with driver photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded driver photo to S3',
            driverPhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ S3 driver photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload driver photo to S3'
        });
    }
});

// Vision AI endpoint for driver details extraction
app.post('/api/vision/extract-driver-details', async (req, res) => {
    try {
        const { base64Image } = req.body;
        
        console.log('🔍 Received driver details extraction request');
        console.log('📸 Base64 image length:', base64Image ? base64Image.length : 'undefined');

        if (!base64Image) {
            return res.status(400).json({
                success: false,
                error: 'Base64 image is required'
            });
        }

        // Ensure base64 image is properly formatted (remove data URL prefix if present)
        let cleanBase64 = base64Image;
        if (base64Image.includes(',')) {
            cleanBase64 = base64Image.split(',')[1];
        }

        console.log('📸 Clean base64 length:', cleanBase64.length);
        console.log('📸 Clean base64 preview:', cleanBase64.substring(0, 50) + '...');

        // Validate base64 format
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(cleanBase64)) {
            console.log('❌ Invalid base64 format detected');
            return res.status(400).json({
                success: false,
                error: 'Invalid base64 image format'
            });
        }

        // Call Google Vision AI for text extraction using REST API
        console.log('🔍 Calling Google Vision AI REST API...');

        const requestBody = {
            requests: [
                {
                    image: {
                        content: cleanBase64
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 50
                        }
                    ]
                }
            ]
        };

        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`Vision AI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.responses || !result.responses[0]) {
            throw new Error('Invalid response from Vision AI API');
        }

        const detections = result.responses[0].textAnnotations || [];
        
        if (detections.length === 0) {
            return res.json({
                success: false,
                message: 'No text detected in the image'
            });
        }

        // Extract text from the first detection (full text)
        const fullText = detections[0].description;
        console.log('📄 Extracted text:', fullText);

        // Parse driver details from text with improved logic
        const driverDetails = parseDriverDetails(fullText);

        res.json({
            success: true,
            data: driverDetails,
            rawText: fullText
        });

    } catch (error) {
        console.error('❌ Driver details extraction error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to extract driver details'
        });
    }
});

// Helper function to extract fields from text
function extractField(text, keywords) {
    const lines = text.split('\n');
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        for (const keyword of keywords) {
            if (lowerLine.includes(keyword.toLowerCase())) {
                // Extract the value after the keyword
                const parts = line.split(':');
                if (parts.length > 1) {
                    return parts[1].trim();
                }
                // If no colon, try to extract after the keyword
                const keywordIndex = lowerLine.indexOf(keyword.toLowerCase());
                if (keywordIndex !== -1) {
                    const afterKeyword = line.substring(keywordIndex + keyword.length).trim();
                    return afterKeyword.split(' ')[0]; // Take first word after keyword
                }
            }
        }
    }
    
    return '';
}

// Improved function to parse driver details from license text
function parseDriverDetails(text) {
    console.log('🔍 Parsing driver details from text...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📝 Text lines:', lines);
    
    const driverDetails = {
        firstName: '',
        lastName: '',
        fullName: '',
        phoneNumber: '',
        licenseNumber: '',
        transporterName: ''
    };
    
    // Extract license number (10 digits)
    const licenseNumberMatch = text.match(/\b\d{10}\b/);
    if (licenseNumberMatch) {
        driverDetails.licenseNumber = licenseNumberMatch[0];
        console.log('✅ Found license number:', driverDetails.licenseNumber);
    }
    
    // Extract family name and given names
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        
        // Look for family name
        if (line.includes('family name') || line.includes('1. family name')) {
            // Look for the name in the next few lines
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                const nameLine = lines[j].trim();
                if (nameLine && !nameLine.includes('given names') && !nameLine.includes('date of birth')) {
                    driverDetails.lastName = nameLine;
                    console.log('✅ Found family name:', driverDetails.lastName);
                    break;
                }
            }
        }
        
        // Look for given names
        if (line.includes('given names') || line.includes('2. given names')) {
            // Look for the name in the next few lines
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                const nameLine = lines[j].trim();
                if (nameLine && !nameLine.includes('date of birth') && !nameLine.includes('family name')) {
                    driverDetails.firstName = nameLine;
                    console.log('✅ Found given names:', driverDetails.firstName);
                    break;
                }
            }
        }
        
        // Look for phone number (various formats)
        if (line.includes('phone') || line.includes('mobile') || line.includes('contact')) {
            const phoneMatch = line.match(/(\+?\d{1,4}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
            if (phoneMatch) {
                driverDetails.phoneNumber = phoneMatch[0].replace(/[\s-]/g, '');
                console.log('✅ Found phone number:', driverDetails.phoneNumber);
            }
        }
        
        // Look for transporter/company name
        if (line.includes('transporter') || line.includes('company') || line.includes('employer')) {
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                const companyLine = lines[j].trim();
                if (companyLine && companyLine.length > 2) {
                    driverDetails.transporterName = companyLine;
                    console.log('✅ Found transporter name:', driverDetails.transporterName);
                    break;
                }
            }
        }
    }
    
    // Combine first and last name for full name
    if (driverDetails.firstName && driverDetails.lastName) {
        driverDetails.fullName = `${driverDetails.firstName} ${driverDetails.lastName}`;
    } else if (driverDetails.firstName) {
        driverDetails.fullName = driverDetails.firstName;
    } else if (driverDetails.lastName) {
        driverDetails.fullName = driverDetails.lastName;
    }
    
    console.log('📋 Parsed driver details:', driverDetails);
    return driverDetails;
}

// Image upload endpoint for mobile app (legacy - for other photo types)
app.post('/api/upload/mobile-photos', upload.array('photos', 10), async (req, res) => {
    try {
        const { tripSegmentNumber, containerNumber, photoType } = req.body;
        
        console.log('📸 Received mobile photo upload:', {
            tripSegmentNumber,
            containerNumber,
            photoType,
            fileCount: req.files?.length || 0
        });

        if (!tripSegmentNumber) {
            return res.status(400).json({
                success: false,
                error: 'Trip segment number is required'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        // Process uploaded files
        const uploadedFiles = [];
        for (const file of req.files) {
            const relativePath = `/arrivedContainers/${tripSegmentNumber}/${file.filename}`;
            uploadedFiles.push(relativePath);
            
            console.log(`✅ File uploaded: ${file.filename} -> ${relativePath}`);
        }

        // Update TripSegment document with image paths
        const tripsegmentsCollection = db.collection('tripsegments');
        
        // Determine which field to update based on photo type
        let updateField = 'containerPhotos';
        if (photoType === 'truck') {
            updateField = 'truckPhoto';
        } else if (photoType === 'trailer') {
            updateField = 'trailerPhoto';
        } else if (photoType === 'damage') {
            updateField = 'damagePhotos';
        }

        // Update the document
        const updateData = {};
        if (updateField === 'truckPhoto' || updateField === 'trailerPhoto') {
            // Single photo fields
            updateData[updateField] = uploadedFiles[0];
        } else {
            // Array photo fields - append to existing photos
            updateData.$push = {
                [updateField]: { $each: uploadedFiles }
            };
        }

        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            updateData,
            { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with ${uploadedFiles.length} photos`);

        res.json({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} photos`,
            uploadedFiles: uploadedFiles,
            tripSegmentNumber: tripSegmentNumber,
            photoType: photoType
        });

    } catch (error) {
        console.error('❌ Mobile photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload photos'
        });
    }
});

// Start server
async function startServer() {
    // Ensure shared directories exist
    await ensureSharedDirectories();
    
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

    // API endpoint to update trip segment with driver details
    app.put('/api/trip-segments/update-driver-details', async (req, res) => {
        try {
            console.log('🔍 Received driver details update request');
            const { 
                tripSegmentNumber, 
                transporterName, 
                driverFirstName, 
                driverLastName, 
                driverLicenceNumber, 
                driverPhoneNumber, 
                containerStatus,
                driverPhoto 
            } = req.body;

            console.log('📊 Update data:', {
                tripSegmentNumber,
                transporterName,
                driverFirstName,
                driverLastName,
                driverLicenceNumber,
                driverPhoneNumber,
                containerStatus,
                driverPhoto: driverPhoto ? 'Present' : 'Not provided'
            });

            // Validate required fields
            if (!tripSegmentNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Trip segment number is required'
                });
            }

            // Update TripSegment document with driver details
            const tripsegmentsCollection = db.collection('tripsegments');
            
            const updateData = {
                transporterName: transporterName || "Local Transporter",
                driverFirstName: driverFirstName || '',
                driverLastName: driverLastName || '',
                driverLicenceNumber: driverLicenceNumber || '',
                driverPhoneNumber: driverPhoneNumber || '',
                containerStatus: containerStatus || 'Arrived'
            };

            // Add driver photo if provided
            if (driverPhoto) {
                updateData.driverPhoto = driverPhoto;
            }

            const updateResult = await tripsegmentsCollection.updateOne(
                { tripSegmentNumber: tripSegmentNumber },
                { $set: updateData }
            );

            if (updateResult.matchedCount === 0) {
                console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
                return res.status(404).json({
                    success: false,
                    error: 'Trip segment not found'
                });
            }

            if (updateResult.modifiedCount === 0) {
                console.log(`⚠️ Trip segment ${tripSegmentNumber} found but no changes made`);
                return res.status(200).json({
                    success: true,
                    message: 'Trip segment found but no changes were needed'
                });
            }

            console.log(`✅ Trip segment ${tripSegmentNumber} updated successfully with driver details`);
            
            res.json({
                success: true,
                message: 'Driver details updated successfully',
                tripSegmentNumber: tripSegmentNumber,
                updatedFields: Object.keys(updateData)
            });

        } catch (error) {
            console.error('❌ Error updating trip segment with driver details:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update trip segment'
            });
        }
    });

    await connectToDatabase();

    app.listen(PORT, '0.0.0.0', () => {
        // Server started
    });
}

startServer().catch(() => process.exit(1));
