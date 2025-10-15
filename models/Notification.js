import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false // null means notification for all users
    },
    type: {
        type: String,
        enum: ['STATUS_CHANGE', 'PAYMENT_RECEIVED'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    containerNumber: {
        type: String,
        required: false
    },
    tripSegmentId: {
        type: Schema.Types.ObjectId,
        ref: 'TripSegment',
        required: false
    },
    tripSegmentNumber: {
        type: String,
        required: false
    },
    isRead: {
        type: Boolean,
        default: false
    },
    metadata: {
        oldStatus: String,
        newStatus: String,
        oldPaymentStatus: String,
        newPaymentStatus: String,
        shippingLine: String,
        containerSize: String
    },
    link: {
        type: String,
        required: false // Link to the related page
    }
}, { 
    timestamps: true 
});

// Index for faster queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

