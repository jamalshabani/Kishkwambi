const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
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

// Backblaze B2 Configuration (S3-compatible API)
const s3Client = new S3Client({
    region: process.env.B2_REGION || 'eu-central-003',
    endpoint: process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
    credentials: {
        accessKeyId: process.env.B2_APPLICATION_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true, // Required for B2
});

const S3_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'simba-terminal-photos';

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

// Helper function to generate standardized filenames
function generateFilename(tripSegmentNumber, photoType, sequenceNumber, timestamp) {
    return `${tripSegmentNumber}_${photoType}_${sequenceNumber}_${timestamp}.jpg`;
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
        const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.B2_REGION || 'eu-central-003'}.backblazeb2.com/${key}`;
        
        console.log(`✅ File uploaded to B2: ${key}`);
        return { success: true, url: publicUrl, key: key };
    } catch (error) {
        console.error('❌ B2 upload error:', error);
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
        console.log(`✅ File deleted from B2: ${key}`);
        return { success: true };
    } catch (error) {
        console.error('❌ B2 delete error:', error);
        return { success: false, error: error.message };
    }
}

// Configure multer for file uploads
// Use memory storage for B2 uploads (gets file buffer)
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
        console.log('🔌 Connecting to MongoDB...');
        const client = new MongoClient(MONGODB_URI);

        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ MongoDB connected successfully');
        console.log(`📦 Database: ${DB_NAME}`);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

// API Routes

app.get('/api/health', async (req, res) => {
    res.json({
        success: true,
        message: 'Backend server is running'
    });
});

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
        console.log(`🔐 Login attempt for: ${email}`);

        if (!email || !password) {
            console.log('❌ Missing credentials');
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (!db) {
            console.error('❌ Database not connected');
            throw new Error('Database not connected');
        }

        const collection = db.collection(COLLECTION_NAME);
        const user = await collection.findOne({ email });
        console.log(`👤 User found: ${user ? 'Yes' : 'No'}`);

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

// Change password endpoint
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID, current password, and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        if (!db) {
            throw new Error('Database not connected');
        }

        const collection = db.collection(COLLECTION_NAME);
        
        // Find user by ID
        const user = await collection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.isActive !== 'Yes') {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Verify current password
        const bcrypt = require('bcryptjs');
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash the new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user's password
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedNewPassword } }
        );

        if (result.modifiedCount === 1) {
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update password'
            });
        }
    } catch (error) {
        console.error('Change password error:', error);
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
app.post('/api/vision/process-image', uploadS3.single('image'), async (req, res) => {
    try {
        // Extract image file from multer
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
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

        // Use the file buffer directly from multer (already in memory)
        const imageBuffer = req.file.buffer;
        
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
// GUARANTEED to return ONLY one of these colors: Blue, Red, Green, Yellow, White, Black, Gray, Orange, Brown, Silver
// Any other detected color will be mapped to the closest allowed color
app.post('/api/vision/google-vision-color', uploadS3.single('image'), async (req, res) => {
    try {
        // Extract image file from multer
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
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

        // Convert image buffer to base64 for Google Vision API
        const base64Image = req.file.buffer.toString('base64');

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

        
        // Check for API-level errors
        if (data.error) {
            return res.status(500).json({
                success: false,
                error: `Google Vision API Error: ${data.error.message}`,
                code: data.error.code
            });
        }
        
        if (data.responses && data.responses[0].textAnnotations) {
            const detectedText = data.responses[0].textAnnotations[0].description;
            
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
            // GUARANTEED to return ONLY one of: Blue, Red, Green, Yellow, White, Black, Gray, Orange, Brown, Silver
            const getColorName = (r, g, b) => {
                // Comprehensive color reference database - ONLY allowed colors
                // RGB values tuned for shipping container colors
                const colorDatabase = [
                    { name: 'Blue', rgb: [11, 79, 163], tolerance: 80 },        // Container blue #0B4FA3
                    { name: 'Red', rgb: [198, 44, 40], tolerance: 80 },         // Container red #C62C28
                    { name: 'Green', rgb: [24, 120, 34], tolerance: 80 },       // Container green #187822
                    { name: 'Yellow', rgb: [238, 204, 76], tolerance: 80 },     // Container yellow #EECC4C
                    { name: 'White', rgb: [231, 231, 231], tolerance: 50 },     // Container white #E7E7E7
                    { name: 'Black', rgb: [29, 29, 29], tolerance: 50 },        // Container black #1D1D1D
                    { name: 'Gray', rgb: [110, 110, 112], tolerance: 60 },      // Container gray #6E6E70
                    { name: 'Orange', rgb: [246, 132, 0], tolerance: 80 },      // Container orange #F68400
                    { name: 'Brown', rgb: [159, 87, 80], tolerance: 80 },       // Container brown #9F5750
                    { name: 'Silver', rgb: [163, 178, 192], tolerance: 60 }     // Container silver #A3B2C0
                ];

                // Calculate Euclidean distance between colors
                const calculateDistance = (color1, color2) => {
                    return Math.sqrt(
                        Math.pow(color1[0] - color2[0], 2) +
                        Math.pow(color1[1] - color2[1], 2) +
                        Math.pow(color1[2] - color2[2], 2)
                    );
                };

                // Find the closest color match - always return the nearest allowed color
                let closestColor = null;
                let minDistance = Infinity;
                let absoluteClosestColor = null;
                let absoluteMinDistance = Infinity;

                for (const color of colorDatabase) {
                    const distance = calculateDistance([r, g, b], color.rgb);
                    
                    // Track absolute closest for fallback
                    if (distance < absoluteMinDistance) {
                        absoluteMinDistance = distance;
                        absoluteClosestColor = color.name;
                    }
                    
                    // Track closest within tolerance
                    if (distance < minDistance && distance <= color.tolerance) {
                        minDistance = distance;
                        closestColor = color.name;
                    }
                }

                // If no color within tolerance found, return the absolute closest allowed color
                if (!closestColor) {
                    console.log(`⚠️ No color within tolerance for RGB(${r}, ${g}, ${b}), using closest match: ${absoluteClosestColor}`);
                    return absoluteClosestColor;
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
                
                if (imageProps.dominantColors && imageProps.dominantColors.colors && imageProps.dominantColors.colors.length > 0) {
                    // Get the most dominant color
                    dominantColor = imageProps.dominantColors.colors[0];
                    const rgb = dominantColor.color;
                    dominantColorHex = rgbToHex(rgb.red || 0, rgb.green || 0, rgb.blue || 0);
                    dominantColorName = getColorName(rgb.red || 0, rgb.green || 0, rgb.blue || 0);
                    
                    console.log('Dominant Color RGB:', rgb);
                    console.log('Dominant Color Hex:', dominantColorHex);
                    console.log('Dominant Color Name:', dominantColorName);
                }
                console.log('========================');
            }

            // Use image-detected color, fallback to text-detected color
            let finalColorName = dominantColorName || containerColorFromText;
            
            // Final validation: ensure only allowed colors are returned
            const allowedColors = ['Blue', 'Red', 'Green', 'Yellow', 'White', 'Black', 'Gray', 'Orange', 'Brown', 'Silver'];
            
            // Normalize 'Grey' to 'Gray' if detected
            if (finalColorName === 'Grey') {
                finalColorName = 'Gray';
            }
            
            // If color is not in allowed list, default to Silver
            if (finalColorName && !allowedColors.includes(finalColorName)) {
                console.warn(`⚠️ Invalid color "${finalColorName}" detected, defaulting to Silver`);
                finalColorName = 'Silver';
            }

        console.log('=== EXTRACTED INFO ===');
        console.log('Container Number:', containerNumber || 'NOT FOUND');
        console.log('ISO Code:', isoCode || 'NOT FOUND');
            console.log('Color (from text):', containerColorFromText || 'NOT FOUND');
            console.log('Color (from image):', dominantColorName || 'NOT FOUND');
            console.log('✅ FINAL COLOR (validated):', finalColorName || 'NOT FOUND');
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
        const { containerNumber, containerStatus } = req.body;
        
        console.log('🔍 Received container validation request:', {
            containerNumber,
            containerStatus
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

        // Check if container number exists in tripsegments collection
        const tripsegmentsCollection = db.collection('tripsegments');
        const trimmedContainerNumber = containerNumber.trim();
        
        // Build query object with container number and status
        const baseQuery = { containerNumber: trimmedContainerNumber };
        if (containerStatus) {
            baseQuery.containerStatus = containerStatus;
        }
        
        // Try exact match first
        let existingContainer = await tripsegmentsCollection.findOne(baseQuery);
        
        // If not found, try without spaces (common OCR issue)
        if (!existingContainer) {
            const containerWithoutSpaces = trimmedContainerNumber.replace(/\s/g, '');
            const queryWithoutSpaces = { containerNumber: containerWithoutSpaces };
            if (containerStatus) {
                queryWithoutSpaces.containerStatus = containerStatus;
            }
            existingContainer = await tripsegmentsCollection.findOne(queryWithoutSpaces);
        }

        if (existingContainer) {
            console.log(`✅ Container number ${containerNumber}${containerStatus ? ` with status "${containerStatus}"` : ''} found in database`);
            res.json({
                success: true,
                exists: true,
                message: `Container number ${containerNumber}${containerStatus ? ` with status "${containerStatus}"` : ''} exists in the database`,
                containerData: {
                    containerNumber: existingContainer.containerNumber,
                    tripSegmentNumber: existingContainer.tripSegmentNumber || existingContainer.tripSegment || 'N/A',
                    containerStatus: existingContainer.containerStatus,
                    // Add other relevant fields as needed
                }
            });
        } else {
            console.log(`❌ Container number ${containerNumber}${containerStatus ? ` with status "${containerStatus}"` : ''} not found in database`);
            res.json({
                success: true,
                exists: false,
                message: `Container number ${containerNumber}${containerStatus ? ` with status "${containerStatus}"` : ''} does not exist in the database`
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
app.post('/api/vision/google-vision', uploadS3.single('image'), async (req, res) => {
    try {
        // Extract image file from multer
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
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

        // Convert image buffer to base64 for Google Vision API
        const base64Image = req.file.buffer.toString('base64');

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
        
        // Check for API-level errors
        if (data.error) {
            
            return res.status(500).json({
                success: false,
                error: `Google Vision API Error: ${data.error.message}`,
                code: data.error.code
            });
        }
        
        if (data.responses && data.responses[0].textAnnotations) {
            const detectedText = data.responses[0].textAnnotations[0].description;
            
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

            // Use the formatter utility to get consistent response format with confidence scores
            const formattedResponse = formatGoogleVisionResponse(detectedText);
            
            // Add rawText to the formatted response
            formattedResponse.data.rawText = detectedText;
            
            res.json(formattedResponse);
        } else {
            
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


// B2 Upload endpoint for damage photos
// This endpoint deletes any existing damage photos with the same damageLocation before uploading new ones
// This prevents duplicate uploads when users navigate back and re-submit
app.post('/api/upload/s3-damage-photos', uploadS3.array('photos', 10), async (req, res) => {
    try {
        const { tripSegmentNumber, containerNumber } = req.body;
        
        console.log('📸 Received B2 damage photo upload:', {
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

        const tripsegmentsCollection = db.collection('tripsegments');

        // Get the damageLocation from the request (need it early for deletion)
        const damageLocation = req.body.damageLocation || 'Unknown';

        // Get existing trip segment
        const existingTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        
        // Delete existing damage photos with the same damageLocation BEFORE uploading new ones
        if (existingTripSegment && existingTripSegment.damagePhotos) {
            const photosToDelete = existingTripSegment.damagePhotos.filter(
                photo => photo.damageLocation === damageLocation
            );
            
            if (photosToDelete.length > 0) {
                console.log(`🗑️ Found ${photosToDelete.length} existing damage photo(s) to delete from B2`);
                
                // Delete each photo from B2
                for (const photo of photosToDelete) {
                    try {
                        const urlParts = photo.damagePhotoPath.split('/');
                        const s3Key = urlParts.slice(4).join('/');
                        
                        console.log(`🗑️ Deleting damage photo from B2: ${s3Key}`);
                        const deleteResult = await deleteFromS3(s3Key);
                        
                        if (!deleteResult.success) {
                            console.warn(`⚠️ Failed to delete damage photo from B2: ${s3Key}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error deleting damage photo from B2:`, error);
                    }
                }
                
                // Remove damage photo references from database
                await tripsegmentsCollection.updateOne(
                    { tripSegmentNumber: tripSegmentNumber },
                    {
                        $pull: {
                            damagePhotos: { damageLocation: damageLocation }
                        }
                    }
                );
                
                console.log(`✅ Removed existing damage photo references from database with location: ${damageLocation}`);
            }
        }
        
        // Get updated damage photos count after deletion
        const updatedTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        const existingDamagePhotosCount = updatedTripSegment?.damagePhotos?.length || 0;
        console.log(`📊 Damage photos count after cleanup for ${tripSegmentNumber}: ${existingDamagePhotosCount}`);
        
        // Upload files to B2 and create damage photo objects
        const uploadedFiles = [];
        const damagePhotoObjects = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            // Create B2 key: damage-photos/tripSegmentNumber/filename
            const timestamp = Date.now();
            const sequenceNumber = existingDamagePhotosCount + i + 1;
            const filename = generateFilename(tripSegmentNumber, 'DamagePhoto', sequenceNumber, timestamp);
            const s3Key = `${tripSegmentNumber}/${filename}`;
            
            console.log('📸 File details:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.buffer ? file.buffer.length : 'no buffer',
                filename: filename,
                s3Key: s3Key
            });
            
            // Validate file buffer
            if (!file.buffer || file.buffer.length === 0) {
                console.error('❌ Empty file buffer for:', file.originalname);
                return res.status(400).json({
                    success: false,
                    error: `File ${file.originalname} has no data`
                });
            }
            
            // Upload to B2
            const uploadResult = await uploadToS3(file, s3Key, file.mimetype);
            
            if (uploadResult.success) {
                uploadedFiles.push({
                    s3Key: s3Key,
                    filename: filename,
                    url: uploadResult.url
                });
                
                // Create damage photo object matching the schema
                const damagePhotoObject = {
                    damageLocation: req.body.damageLocation || 'Unknown', // You can pass this from the frontend
                    damagePhotoPath: uploadResult.url, // B2 URL
                    damagePhotoSize: file.size || 0 // File size in bytes
                };
                
                damagePhotoObjects.push(damagePhotoObject);
                console.log(`✅ Damage photo uploaded to B2: ${s3Key}`);
            } else {
                console.error(`❌ Failed to upload ${file.filename}:`, uploadResult.error);
            }
        }

        if (uploadedFiles.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to upload any files to B2'
            });
        }

        // Add the new damage photo objects to the database
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
            message: `Successfully uploaded ${damagePhotoObjects.length} damage photos to B2`,
            uploadedFiles: uploadedFiles,
            damagePhotos: damagePhotoObjects,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 damage photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload damage photos to B2'
        });
    }
});

// B2 Upload endpoint for container photos
// This endpoint deletes any existing container photos with the same containerPhotoLocation before uploading new ones
// This ensures only ONE photo exists per location (Front Wall, Back Wall, Right Wall, Left Wall, Inside)
app.post('/api/upload/s3-container-photos', uploadS3.array('photos', 10), async (req, res) => {
    try {
        const { tripSegmentNumber, containerNumber, photoType } = req.body;
        
        console.log('📸 Received B2 container photo upload:', {
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

        const tripsegmentsCollection = db.collection('tripsegments');

        // Get existing container photos count to determine next sequence number
        const existingTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        const existingContainerPhotosCount = existingTripSegment?.containerPhotos?.length || 0;
        console.log(`📊 Existing container photos count for ${tripSegmentNumber}: ${existingContainerPhotosCount}`);

        // Upload files to B2 and create container photo objects
        const uploadedFiles = [];
        const containerPhotoObjects = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            // Create B2 key: container-photos/tripSegmentNumber/filename
            const timestamp = Date.now();
            const sequenceNumber = existingContainerPhotosCount + i + 1;
            const filename = generateFilename(tripSegmentNumber, 'ContainerPhoto', sequenceNumber, timestamp);
            const s3Key = `${tripSegmentNumber}/${filename}`;
            
            console.log('📸 File details:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.buffer ? file.buffer.length : 'no buffer',
                filename: filename,
                s3Key: s3Key
            });
            
            // Validate file buffer
            if (!file.buffer || file.buffer.length === 0) {
                console.error('❌ Empty file buffer for:', file.originalname);
                return res.status(400).json({
                    success: false,
                    error: `File ${file.originalname} has no data`
                });
            }
            
            // Upload to B2
            const uploadResult = await uploadToS3(file, s3Key, file.mimetype);
            
            if (uploadResult.success) {
                uploadedFiles.push({
                    s3Key: s3Key,
                    filename: filename,
                    url: uploadResult.url
                });
                
                // Create container photo object matching the schema
                const containerPhotoObject = {
                    containerPhotoLocation: req.body.containerPhotoLocation || 'Container Back Wall',
                    containerPhotoPath: uploadResult.url, // B2 URL
                    containerPhotoSize: file.size || 0 // File size in bytes
                };
                
                containerPhotoObjects.push(containerPhotoObject);
                console.log(`✅ Container photo uploaded to B2: ${s3Key}`);
            } else {
                console.error(`❌ Failed to upload ${file.filename}:`, uploadResult.error);
            }
        }

        if (uploadedFiles.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to upload any files to B2'
            });
        }

        // Get the containerPhotoLocation from the first photo (all should have same location)
        const containerPhotoLocation = req.body.containerPhotoLocation || 'Container Back Wall';
        
        // First, find and delete any existing photos with the same containerPhotoLocation
        console.log(`🗑️ Checking for existing photos with location: ${containerPhotoLocation}`);
        
        // Get existing photos to delete from B2
        const existingSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        if (existingSegment && existingSegment.containerPhotos) {
            const photosToDelete = existingSegment.containerPhotos.filter(
                photo => photo.containerPhotoLocation === containerPhotoLocation
            );
            
            if (photosToDelete.length > 0) {
                console.log(`🗑️ Found ${photosToDelete.length} existing photo(s) to delete from B2`);
                
                // Delete each photo from B2
                for (const photo of photosToDelete) {
                    // Extract the S3 key from the photo path
                    // Photo path format: https://s3.region.backblazeb2.com/bucket-name/key
                    const urlParts = photo.containerPhotoPath.split('/');
                    const s3Key = urlParts.slice(4).join('/'); // Get everything after bucket name
                    
                    console.log(`🗑️ Deleting from B2: ${s3Key}`);
                    const deleteResult = await deleteFromS3(s3Key);
                    
                    if (!deleteResult.success) {
                        console.warn(`⚠️ Failed to delete file from B2: ${s3Key}`);
                    }
                }
            }
        }
        
        // Remove photo references from database
        const removeResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $pull: {
                    containerPhotos: { containerPhotoLocation: containerPhotoLocation }
                }
            }
        );
        
        if (removeResult.modifiedCount > 0) {
            console.log(`✅ Removed existing photo references from database with location: ${containerPhotoLocation}`);
        } else {
            console.log(`ℹ️ No existing photos found with location: ${containerPhotoLocation}`);
        }

        // Now add the new container photo objects
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
            message: `Successfully uploaded ${containerPhotoObjects.length} container photos to B2`,
            uploadedFiles: uploadedFiles,
            containerPhotos: containerPhotoObjects,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 container photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload container photos to B2'
        });
    }
});

// Cleanup endpoint to remove duplicate container photos
app.post('/api/cleanup/duplicate-container-photos', async (req, res) => {
    try {
        const { tripSegmentNumber } = req.body;
        
        console.log('🧹 Starting cleanup of duplicate container photos...');
        
        if (!db) {
            throw new Error('Database not connected');
        }

        const tripsegmentsCollection = db.collection('tripsegments');
        
        // Query to find trip segments (or all if no tripSegmentNumber provided)
        const query = tripSegmentNumber ? { tripSegmentNumber } : {};
        const tripSegments = await tripsegmentsCollection.find(query).toArray();
        
        console.log(`📊 Found ${tripSegments.length} trip segments to process`);
        
        let totalCleaned = 0;
        let totalRemoved = 0;
        
        for (const tripSegment of tripSegments) {
            if (!tripSegment.containerPhotos || tripSegment.containerPhotos.length === 0) {
                continue;
            }
            
            // Group photos by containerPhotoLocation
            const photosByLocation = {};
            tripSegment.containerPhotos.forEach((photo, index) => {
                const location = photo.containerPhotoLocation;
                if (!photosByLocation[location]) {
                    photosByLocation[location] = [];
                }
                photosByLocation[location].push({ ...photo, originalIndex: index });
            });
            
            // Find locations with duplicates
            const locationsWithDuplicates = Object.entries(photosByLocation).filter(([location, photos]) => photos.length > 1);
            
            if (locationsWithDuplicates.length > 0) {
                console.log(`🔍 Trip segment ${tripSegment.tripSegmentNumber}: Found duplicates in ${locationsWithDuplicates.length} locations`);
                
                // Keep only the most recent photo for each location (last one in array)
                const photosToKeep = [];
                const photosToDeleteFromB2 = [];
                
                Object.entries(photosByLocation).forEach(([location, photos]) => {
                    if (photos.length > 1) {
                        console.log(`  📸 ${location}: ${photos.length} photos found, keeping most recent`);
                        totalRemoved += photos.length - 1;
                        
                        // Add old photos to deletion list (all except the last one)
                        for (let i = 0; i < photos.length - 1; i++) {
                            photosToDeleteFromB2.push(photos[i]);
                        }
                        
                        // Keep the last (most recent) photo
                        photosToKeep.push(photos[photos.length - 1]);
                    } else {
                        photosToKeep.push(photos[0]);
                    }
                });
                
                // Delete old photos from B2
                if (photosToDeleteFromB2.length > 0) {
                    console.log(`🗑️ Deleting ${photosToDeleteFromB2.length} old photos from B2...`);
                    
                    for (const photo of photosToDeleteFromB2) {
                        try {
                            // Extract the S3 key from the photo path
                            const urlParts = photo.containerPhotoPath.split('/');
                            const s3Key = urlParts.slice(4).join('/');
                            
                            console.log(`🗑️ Deleting from B2: ${s3Key}`);
                            const deleteResult = await deleteFromS3(s3Key);
                            
                            if (!deleteResult.success) {
                                console.warn(`⚠️ Failed to delete file from B2: ${s3Key}`);
                            }
                        } catch (error) {
                            console.warn(`⚠️ Error deleting photo from B2:`, error);
                        }
                    }
                }
                
                // Update the trip segment with deduplicated photos
                const cleanedPhotos = photosToKeep.map(p => ({
                    containerPhotoLocation: p.containerPhotoLocation,
                    containerPhotoPath: p.containerPhotoPath,
                    containerPhotoSize: p.containerPhotoSize
                }));
                
                await tripsegmentsCollection.updateOne(
                    { tripSegmentNumber: tripSegment.tripSegmentNumber },
                    {
                        $set: { containerPhotos: cleanedPhotos }
                    }
                );
                
                totalCleaned++;
                console.log(`✅ Cleaned ${tripSegment.tripSegmentNumber}: ${tripSegment.containerPhotos.length} → ${cleanedPhotos.length} photos`);
            }
        }
        
        console.log(`✅ Cleanup complete: ${totalCleaned} trip segments cleaned, ${totalRemoved} duplicate photos removed`);
        
        res.json({
            success: true,
            message: `Cleanup complete`,
            tripSegmentsCleaned: totalCleaned,
            duplicatesRemoved: totalRemoved
        });
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to cleanup duplicate photos'
        });
    }
});

// Get trailer details endpoint
app.get('/api/trip-segments/:tripSegmentNumber/trailer-details', async (req, res) => {
    try {
        const { tripSegmentNumber } = req.params;
        
        console.log('🚗 Fetching trailer details for:', tripSegmentNumber);

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
        
        const tripSegment = await collection.findOne({ tripSegmentNumber: tripSegmentNumber });

        if (!tripSegment) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Found trip segment ${tripSegmentNumber}, trailerNumber: ${tripSegment.trailerNumber || 'Not set'}`);

        res.json({
            success: true,
            tripSegmentNumber: tripSegmentNumber,
            trailerNumber: tripSegment.trailerNumber || null,
            trailerPhoto: tripSegment.trailerPhoto || null
        });

    } catch (error) {
        console.error('❌ Error fetching trailer details:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch trailer details'
        });
    }
});

// Get truck details endpoint
app.get('/api/trip-segments/:tripSegmentNumber/truck-details', async (req, res) => {
    try {
        const { tripSegmentNumber } = req.params;
        
        console.log('🚛 Fetching truck details for:', tripSegmentNumber);

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
        
        const tripSegment = await collection.findOne({ tripSegmentNumber: tripSegmentNumber });

        if (!tripSegment) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Found trip segment ${tripSegmentNumber}, truckNumber: ${tripSegment.truckNumber || 'Not set'}`);

        res.json({
            success: true,
            tripSegmentNumber: tripSegmentNumber,
            truckNumber: tripSegment.truckNumber || null,
            truckPhoto: tripSegment.truckPhoto || null
        });

    } catch (error) {
        console.error('❌ Error fetching truck details:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch truck details'
        });
    }
});

// Get damage status endpoint
app.get('/api/trip-segments/:tripSegmentNumber/damage-status', async (req, res) => {
    try {
        const { tripSegmentNumber } = req.params;
        
        console.log('🔍 Checking damage status for:', tripSegmentNumber);

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
        
        const tripSegment = await collection.findOne({ tripSegmentNumber: tripSegmentNumber });

        if (!tripSegment) {
            console.log(`❌ Trip segment ${tripSegmentNumber} not found`);
            return res.status(404).json({
                success: false,
                error: `Trip segment ${tripSegmentNumber} not found`
            });
        }

        console.log(`✅ Found trip segment ${tripSegmentNumber}, hasDamages: ${tripSegment.hasDamages}`);

        res.json({
            success: true,
            tripSegmentNumber: tripSegmentNumber,
            hasDamages: tripSegment.hasDamages || 'No',
            damageLocations: tripSegment.damageLocations || []
        });

    } catch (error) {
        console.error('❌ Error checking damage status:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check damage status'
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

// Update damage remarks endpoint
app.post('/api/update-damage-remarks', async (req, res) => {
    try {
        const { tripSegmentNumber, damageRemarks } = req.body;
        
        console.log('📝 Received damage remarks update:', {
            tripSegmentNumber,
            damageRemarks: damageRemarks ? 'Present' : 'Not provided'
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
        
        const updateResult = await collection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $set: {
                    damageRemarks: damageRemarks || '',
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

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with damage remarks`);

        res.json({
            success: true,
            message: 'Damage remarks updated successfully',
            tripSegmentNumber: tripSegmentNumber,
            damageRemarks: damageRemarks
        });

    } catch (error) {
        console.error('❌ Damage remarks update error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update damage remarks'
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

// B2 Upload endpoint for trailer photo
app.post('/api/upload/s3-trailer-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 trailer photo upload:', {
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

        // Upload file to B2
        const timestamp = Date.now();
        const filename = generateFilename(tripSegmentNumber, 'TrailerPhoto', 1, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Validate file buffer
        if (!req.file.buffer || req.file.buffer.length === 0) {
            console.error('❌ Empty file buffer for:', req.file.originalname);
            return res.status(400).json({
                success: false,
                error: `File ${req.file.originalname} has no data`
            });
        }
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload trailer photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload trailer photo to B2'
            });
        }

        console.log(`✅ Trailer photo uploaded to B2: ${s3Key}`);

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
            message: 'Successfully uploaded trailer photo to B2',
            trailerPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 trailer photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload trailer photo to B2'
        });
    }
});

// B2 Upload endpoint for front wall photo
app.post('/api/upload/s3-front-wall-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 front wall photo upload:', {
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

        // Get existing container photos count to determine next sequence number
        const existingTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        const existingContainerPhotosCount = existingTripSegment?.containerPhotos?.length || 0;
        console.log(`📊 Existing container photos count for ${tripSegmentNumber}: ${existingContainerPhotosCount}`);

        // Upload file to B2
        const timestamp = Date.now();
        const sequenceNumber = existingContainerPhotosCount + 1;
        const filename = generateFilename(tripSegmentNumber, 'ContainerPhoto', sequenceNumber, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload front wall photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload front wall photo to B2'
            });
        }

        console.log(`✅ Front wall photo uploaded to B2: ${s3Key}`);

        // Update TripSegment document with container photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const containerPhotoObject = {
            photoType: 'ContainerPhoto',
            photoPath: uploadResult.url,
            photoSize: req.file.buffer ? req.file.buffer.length : 0,
            damageLocation: 'Front Wall',
            uploadedAt: new Date().toISOString(),
            filename: filename
        };
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $push: {
                    containerPhotos: containerPhotoObject
                },
                $set: {
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

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with container photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded container photo to B2',
            containerPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 front wall photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload front wall photo to B2'
        });
    }
});

// B2 Upload endpoint for truck photo
app.post('/api/upload/s3-truck-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 truck photo upload:', {
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

        // Upload file to B2
        const timestamp = Date.now();
        const filename = generateFilename(tripSegmentNumber, 'TruckPhoto', 1, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload truck photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload truck photo to B2'
            });
        }

        console.log(`✅ Truck photo uploaded to B2: ${s3Key}`);

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
            message: 'Successfully uploaded truck photo to B2',
            truckPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 truck photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload truck photo to B2'
        });
    }
});

// B2 Upload endpoint for left side photo
app.post('/api/upload/s3-left-side-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 left side photo upload:', {
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

        // Upload file to B2
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
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload left side photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload left side photo to B2'
            });
        }

        console.log(`✅ Left side photo uploaded to B2: ${s3Key}`);

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
            message: 'Successfully uploaded left side photo to B2',
            leftSidePhoto: uploadResult.url,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 left side photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload left side photo to B2'
        });
    }
});

// B2 Upload endpoint for inside photo
app.post('/api/upload/s3-inside-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 inside photo upload:', {
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

        const tripsegmentsCollection = db.collection('tripsegments');

        // Get existing container photos count to determine next sequence number
        const existingTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        const existingContainerPhotosCount = existingTripSegment?.containerPhotos?.length || 0;
        console.log(`📊 Existing container photos count for ${tripSegmentNumber}: ${existingContainerPhotosCount}`);

        // Upload file to B2
        const timestamp = Date.now();
        const sequenceNumber = existingContainerPhotosCount + 1;
        const filename = generateFilename(tripSegmentNumber, 'ContainerPhoto', sequenceNumber, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload inside photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload inside photo to B2'
            });
        }

        console.log(`✅ Inside photo uploaded to B2: ${s3Key}`);

        // Update TripSegment document with container photo
        const containerPhotoObject = {
            photoType: 'ContainerPhoto',
            photoPath: uploadResult.url,
            photoSize: req.file.buffer ? req.file.buffer.length : 0,
            damageLocation: 'Inside',
            uploadedAt: new Date().toISOString(),
            filename: filename
        };
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $push: {
                    containerPhotos: containerPhotoObject
                },
                $set: {
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

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with container photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded container photo to B2',
            containerPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 inside photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload inside photo to B2'
        });
    }
});

// B2 Upload endpoint for right side photo
app.post('/api/upload/s3-right-side-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 right side photo upload:', {
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

        // Get existing container photos count to determine next sequence number
        const existingTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        const existingContainerPhotosCount = existingTripSegment?.containerPhotos?.length || 0;
        console.log(`📊 Existing container photos count for ${tripSegmentNumber}: ${existingContainerPhotosCount}`);

        // Upload file to B2
        const timestamp = Date.now();
        const sequenceNumber = existingContainerPhotosCount + 1;
        const filename = generateFilename(tripSegmentNumber, 'ContainerPhoto', sequenceNumber, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload right side photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload right side photo to B2'
            });
        }

        console.log(`✅ Right side photo uploaded to B2: ${s3Key}`);

        // Update TripSegment document with container photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const containerPhotoObject = {
            photoType: 'ContainerPhoto',
            photoPath: uploadResult.url,
            photoSize: req.file.buffer ? req.file.buffer.length : 0,
            damageLocation: 'Right Side',
            uploadedAt: new Date().toISOString(),
            filename: filename
        };
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $push: {
                    containerPhotos: containerPhotoObject
                },
                $set: {
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

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with container photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded container photo to B2',
            containerPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 right side photo upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during right side photo upload'
        });
    }
});

// B2 Upload endpoint for left side photo
app.post('/api/upload/s3-left-side-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 left side photo upload:', {
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

        // Get existing container photos count to determine next sequence number
        const existingTripSegment = await tripsegmentsCollection.findOne({ tripSegmentNumber: tripSegmentNumber });
        const existingContainerPhotosCount = existingTripSegment?.containerPhotos?.length || 0;
        console.log(`📊 Existing container photos count for ${tripSegmentNumber}: ${existingContainerPhotosCount}`);

        // Upload file to B2
        const timestamp = Date.now();
        const sequenceNumber = existingContainerPhotosCount + 1;
        const filename = generateFilename(tripSegmentNumber, 'ContainerPhoto', sequenceNumber, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload left side photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload left side photo to B2'
            });
        }

        console.log(`✅ Left side photo uploaded to B2: ${s3Key}`);

        // Update TripSegment document with container photo
        const tripsegmentsCollection = db.collection('tripsegments');
        
        const containerPhotoObject = {
            photoType: 'ContainerPhoto',
            photoPath: uploadResult.url,
            photoSize: req.file.buffer ? req.file.buffer.length : 0,
            damageLocation: 'Left Side',
            uploadedAt: new Date().toISOString(),
            filename: filename
        };
        
        const updateResult = await tripsegmentsCollection.updateOne(
            { tripSegmentNumber: tripSegmentNumber },
            {
                $push: {
                    containerPhotos: containerPhotoObject
                },
                $set: {
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

        console.log(`✅ Updated trip segment ${tripSegmentNumber} with container photo`);

        res.json({
            success: true,
            message: 'Successfully uploaded container photo to B2',
            containerPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 left side photo upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during left side photo upload'
        });
    }
});

// B2 Upload endpoint for driver photo
app.post('/api/upload/s3-driver-photo', uploadS3.single('photo'), async (req, res) => {
    try {
        const { tripSegmentNumber, photoType } = req.body;
        
        console.log('📸 Received B2 driver photo upload:', {
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

        // Upload file to B2
        const timestamp = Date.now();
        const filename = generateFilename(tripSegmentNumber, 'DriverPhoto', 1, timestamp);
        const s3Key = `${tripSegmentNumber}/${filename}`;
        
        console.log('📸 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.buffer ? req.file.buffer.length : 'no buffer',
            filename: filename,
            s3Key: s3Key
        });
        
        // Upload to B2
        const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);
        
        if (!uploadResult.success) {
            console.error(`❌ Failed to upload driver photo:`, uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload driver photo to B2'
            });
        }

        console.log(`✅ Driver photo uploaded to B2: ${s3Key}`);

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
            message: 'Successfully uploaded driver photo to B2',
            driverPhoto: uploadResult.url,
            filename: filename,
            tripSegmentNumber: tripSegmentNumber
        });

    } catch (error) {
        console.error('❌ B2 driver photo upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload driver photo to B2'
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
    app.post('/api/plate-recognizer/recognize', uploadS3.single('image'), async (req, res) => {
        try {
            console.log('🚗 Received trailer photo for plate recognition');

            // Extract image file from multer
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Image file is required'
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
            
            // Use the file buffer directly from multer (already in memory)
            const imageBuffer = req.file.buffer;
            
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
                driverPhoto,
                inspectionDate,
                inspectionTime,
                finalApproval,
                gateInTimeStamp,
                inwardLOLOBalance
            } = req.body;

            console.log('📊 Update data:', {
                tripSegmentNumber,
                transporterName,
                driverFirstName,
                driverLastName,
                driverLicenceNumber,
                driverPhoneNumber,
                containerStatus,
                driverPhoto: driverPhoto ? 'Present' : 'Not provided',
                inspectionDate,
                inspectionTime,
                finalApproval,
                gateInTimeStamp,
                inwardLOLOBalance
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

            // Add additional inspection fields if provided
            if (inspectionDate) {
                updateData.inspectionDate = inspectionDate;
            }
            if (inspectionTime) {
                updateData.inspectionTime = inspectionTime;
            }
            if (finalApproval !== undefined) {
                updateData.finalApproval = finalApproval;
            }
            if (gateInTimeStamp) {
                updateData.gateInTimeStamp = gateInTimeStamp;
            }
            if (inwardLOLOBalance) {
                updateData.inwardLOLOBalance = inwardLOLOBalance;
            }

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

    // API endpoint to update trip segment with trailer details
    app.put('/api/trip-segments/update-trailer-details', async (req, res) => {
        try {
            console.log('🚗 Received trailer details update request');
            const { 
                tripSegmentNumber, 
                trailerNumber, 
                trailerPhoto 
            } = req.body;

            console.log('📊 Update data:', {
                tripSegmentNumber,
                trailerNumber,
                trailerPhoto: trailerPhoto ? 'Present' : 'Not provided'
            });

            // Validate required fields
            if (!tripSegmentNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Trip segment number is required'
                });
            }

            // Update TripSegment document with trailer details
            const tripsegmentsCollection = db.collection('tripsegments');
            
            const updateData = {};

            // Add trailer number if provided
            if (trailerNumber) {
                updateData.trailerNumber = trailerNumber;
            }

            // Add trailer photo if provided
            if (trailerPhoto) {
                updateData.trailerPhoto = trailerPhoto;
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

            console.log(`✅ Trip segment ${tripSegmentNumber} updated successfully with trailer details`);
            
            res.json({
                success: true,
                message: 'Trailer details updated successfully',
                tripSegmentNumber: tripSegmentNumber,
                updatedFields: Object.keys(updateData)
            });

        } catch (error) {
            console.error('❌ Error updating trip segment with trailer details:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update trip segment'
            });
        }
    });

    // API endpoint to update trip segment with truck details
    app.put('/api/trip-segments/update-truck-details', async (req, res) => {
        try {
            console.log('🚛 Received truck details update request');
            const { 
                tripSegmentNumber, 
                truckNumber, 
                truckPhoto 
            } = req.body;

            console.log('📊 Update data:', {
                tripSegmentNumber,
                truckNumber,
                truckPhoto: truckPhoto ? 'Present' : 'Not provided'
            });

            // Validate required fields
            if (!tripSegmentNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Trip segment number is required'
                });
            }

            // Update TripSegment document with truck details
            const tripsegmentsCollection = db.collection('tripsegments');
            
            const updateData = {};

            // Add truck number if provided
            if (truckNumber) {
                updateData.truckNumber = truckNumber;
            }

            // Add truck photo if provided
            if (truckPhoto) {
                updateData.truckPhoto = truckPhoto;
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

            console.log(`✅ Trip segment ${tripSegmentNumber} updated successfully with truck details`);
            
            res.json({
                success: true,
                message: 'Truck details updated successfully',
                tripSegmentNumber: tripSegmentNumber,
                updatedFields: Object.keys(updateData)
            });

        } catch (error) {
            console.error('❌ Error updating trip segment with truck details:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update trip segment'
            });
        }
    });

    await connectToDatabase();

    // Test endpoint to verify server is working
    app.get('/api/test', (req, res) => {
        res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
    });
}

startServer().catch(() => process.exit(1));
