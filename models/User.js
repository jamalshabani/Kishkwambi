import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    firstName: {
        type: String,
        required: true
    },

    lastName: {
        type: String,
        required: true
    },

    profilePicture: {
        type: String,
        required: false
    },

    role: {
        type: String,
        required: true
    },

    permissions: {
        type: Array,
        required: true
    },

    isActive: {
        type: String,
        required: false,
        default: 'Yes'
    },

    passwordToken: {
        type: String,
        required: true
    },

    // PIN-related fields for quick login
    pinDevices: [{
        deviceId: {
            type: String,
            required: true
        },
        pinHash: {
            type: String,
            required: true
        },
        deviceName: {
            type: String,
            default: 'Unknown Device'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastUsed: {
            type: Date,
            default: Date.now
        },
        // Brute force protection
        failedAttempts: {
            type: Number,
            default: 0
        },
        lockedUntil: {
            type: Date,
            default: null
        },
        lastFailedAttempt: {
            type: Date,
            default: null
        }
    }]

}, { timestamps: true }
)

export default mongoose.models.User || mongoose.model("User", userSchema)