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

        // Plate Recognizer API token from environment variable
        const PLATE_RECOGNIZER_TOKEN = process.env.PLATE_RECOGNIZER_TOKEN;
        
        if (!PLATE_RECOGNIZER_TOKEN) {
            return res.status(500).json({
                success: false,
                error: 'Plate Recognizer API token not configured'
            });
        }

        const PLATE_RECOGNIZER_URL = 'https://api.platerecognizer.com/v1/plate-reader/';
        
        const fetch = require('node-fetch');
        const FormData = require('form-data');
        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Create form data
        const formData = new FormData();
        formData.append('upload', imageBuffer, {
            filename: 'container.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('regions', 'container'); // Optimize for containers
        
        const response = await fetch(PLATE_RECOGNIZER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${PLATE_RECOGNIZER_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData,
        });

        const data = await response.json();
        
        console.log('=== PLATE RECOGNIZER RESPONSE ===');
        console.log(JSON.stringify(data, null, 2));
        console.log('=== RESPONSE STRUCTURE ===');
        console.log('Has results?', !!data.results);
        console.log('Results count:', data.results?.length || 0);
        console.log('Processing time:', data.processing_time);
        
        // Check for API-level errors
        if (data.error) {
            console.log('=== PLATE RECOGNIZER ERROR ===');
            console.log('Error:', data.error);
            console.log('========================');
            
            return res.status(500).json({
                success: false,
                error: `Plate Recognizer API Error: ${data.error}`
            });
        }
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const detectedText = result.plate || '';
            
            console.log('=== DETECTED CONTAINER NUMBER ===');
            console.log('Plate:', detectedText);
            console.log('Confidence:', result.score);
            console.log('Candidates:', result.candidates?.length || 0);
            console.log('========================');
            
            // Plate Recognizer returns the container number directly
            const containerNumber = detectedText.replace(/\s/g, '');
            
            // Extract ISO code from vehicle info if available
            let isoCode = '';
            if (result.vehicle?.type) {
                // Check if there's ISO code in vehicle type or other fields
                const vehicleText = JSON.stringify(result.vehicle);
                const isoPattern = /\b\d{2}[A-Z]\d\b/g;
                const isoMatch = vehicleText.match(isoPattern);
                if (isoMatch) {
                    isoCode = isoMatch[0];
                }
            }
            
            // Try to extract ISO code from any text in the response
            if (!isoCode && result.region?.code) {
                const regionText = result.region.code;
                const isoPattern = /\b\d{2}[A-Z]\d\b/g;
                const isoMatch = regionText.match(isoPattern);
                if (isoMatch) {
                    isoCode = isoMatch[0];
                }
            }

            console.log('=== EXTRACTED INFO ===');
            console.log('Container Number:', containerNumber || 'NOT FOUND');
            console.log('ISO Code:', isoCode || 'NOT FOUND');
            console.log('Confidence Score:', (result.score * 100).toFixed(2) + '%');
            console.log('Processing Time:', data.processing_time + 's');
            console.log('=====================');

            res.json({
                success: true,
                data: {
                    containerNumber,
                    isoCode,
                    containerColor: '', // Plate Recognizer doesn't detect colors
                    colorHex: '',
                    confidence: result.score,
                    processingTime: data.processing_time,
                    candidates: result.candidates || [],
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
