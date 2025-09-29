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
app.use(express.json());

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


// Start server
async function startServer() {
    await connectToDatabase();

    app.listen(PORT, '0.0.0.0', () => {
        // Server started
    });
}

startServer().catch(() => process.exit(1));
