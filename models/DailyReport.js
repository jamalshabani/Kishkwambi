import mongoose from "mongoose";

const { Schema } = mongoose;

const dailyReportSchema = new Schema({
    reportDate: {
        type: Date,
        required: true
    },
    
    shippingLine: {
        type: String,
        required: true
    },
    
    reportData: {
        type: Object,
        required: true
    },
    
    filePath: {
        type: String,
        required: true
    },
    
    emailSent: {
        type: Boolean,
        default: false
    },
    
    emailSentAt: {
        type: Date,
        default: null
    },
    
    emailRecipients: [{
        type: String
    }],
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
dailyReportSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const DailyReport = mongoose.models.DailyReport || mongoose.model('DailyReport', dailyReportSchema);

export default DailyReport;
