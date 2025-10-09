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

}, { timestamps: true }
)

export default mongoose.models.User || mongoose.model("User", userSchema)