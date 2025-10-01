const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

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

            // Extract color from text (fallback method)
            const colors = ['red', 'blue', 'green', 'yellow', 'white', 'grey', 'gray', 'orange', 'brown', 'black'];
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

            // Helper function to get color name from RGB
            const getColorName = (r, g, b) => {
                // Simple color categorization
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


// Start server
async function startServer() {
    await connectToDatabase();

    app.listen(PORT, '0.0.0.0', () => {
        // Server started
    });
}

startServer().catch(() => process.exit(1));
