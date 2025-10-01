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

        // Extract container information from ParkPow response
        let containerNumber = '';
        let isoCode = '';
        let containerColor = '';
        let colorHex = '';
        let rawText = '';

        // ParkPow typically returns structured data
        if (data.container_number) {
            containerNumber = data.container_number;
        }
        
        if (data.iso_code) {
            isoCode = data.iso_code;
        }
        
        if (data.color) {
            containerColor = data.color;
        }
        
        if (data.color_hex) {
            colorHex = data.color_hex;
        }
        
        if (data.raw_text) {
            rawText = data.raw_text;
        }

        // If ParkPow doesn't return structured data, try to extract from raw text
        if (!containerNumber && rawText) {
            // Pattern: 4 letters + 6 or 7 digits (with optional spaces and check digit)
            const containerPattern = /[A-Z]{4}\s*\d{6,7}\s*\d?/g;
            const containerMatch = rawText.match(containerPattern);
            if (containerMatch) {
                containerNumber = containerMatch[0].replace(/\s/g, '');
                if (containerNumber.length < 11) {
                    containerNumber = containerNumber.padEnd(11, '');
                }
            }
        }

        if (!isoCode && rawText) {
            // ISO Code extraction with OCR error correction
            const isoPattern = /\b\d{2}[A-Z]\d\b/g;
            const isoMatch = rawText.match(isoPattern);
            
            if (isoMatch) {
                isoCode = isoMatch[0];
            } else {
                // If no match, look for 4 consecutive digits (common OCR error)
                const fourDigitsPattern = /\b\d{4}\b/g;
                const fourDigitsMatch = rawText.match(fourDigitsPattern);
                
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
                        const digits = candidate.split('');
                        const thirdChar = digits[2];
                        
                        if (digitToLetter[thirdChar]) {
                            digits[2] = digitToLetter[thirdChar];
                            isoCode = digits.join('');
                            console.log(`OCR Correction: ${candidate} -> ${isoCode} (replaced ${thirdChar} with ${digitToLetter[thirdChar]})`);
                            break;
                        }
                    }
                }
            }
        }

        if (!containerColor && rawText) {
            // Extract color from text
            const colors = ['red', 'blue', 'green', 'yellow', 'white', 'grey', 'gray', 'orange', 'brown', 'black'];
            const textLower = rawText.toLowerCase();
            for (const color of colors) {
                if (textLower.includes(color)) {
                    containerColor = color.charAt(0).toUpperCase() + color.slice(1);
                    break;
                }
            }
        }

        console.log('=== EXTRACTED INFO ===');
        console.log('Container Number:', containerNumber || 'NOT FOUND');
        console.log('ISO Code:', isoCode || 'NOT FOUND');
        console.log('Color:', containerColor || 'NOT FOUND');
        console.log('Color Hex:', colorHex || 'NOT FOUND');
        console.log('Raw Text:', rawText || 'NOT FOUND');
        console.log('=====================');

        res.json({
            success: true,
            data: {
                containerNumber,
                isoCode,
                containerColor,
                colorHex,
                rawText,
                parkpowResponse: data // Include full ParkPow response for debugging
            }
        });

    } catch (error) {
        console.error('ParkPow API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process image with ParkPow API'
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
