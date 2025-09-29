import mongoose from 'mongoose';

const organizationSettingSchema = new mongoose.Schema({
    organizationName: {
        type: String,
        required: true,
        trim: true
    },
    organizationAddress: {
        type: String,
        required: true,
        trim: true
    },
    organizationEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    organizationTIN: {
        type: String,
        required: true,
        trim: true
    },
    organizationVRN: {
        type: String,
        required: true,
        trim: true
    },
    companyStamp: {
        type: String, // Base64 encoded image or file path
        default: null
    },
    importantPhoneNumbers: {
        type: String,
        default: ''
    },
    // Director information
    directors: [{
        name: {
            type: String,
            default: ''
        },
        signature: {
            type: String, // Base64 encoded image or file path
            default: null
        }
    }],
    // Organization assets
    organizationLogo: {
        type: String, // Base64 encoded image or file path
        default: null
    },
    letterheadTop: {
        type: String, // Base64 encoded image or file path
        default: null
    },
    letterheadBottom: {
        type: String, // Base64 encoded image or file path
        default: null
    },
    // Metadata
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Ensure only one active organization setting exists
organizationSettingSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Pre-save middleware to handle directors array
organizationSettingSchema.pre('save', function(next) {
    // Ensure we have exactly 5 directors
    if (this.directors.length < 5) {
        while (this.directors.length < 5) {
            this.directors.push({ name: '', signature: null });
        }
    }
    next();
});

// Static method to get active organization settings
organizationSettingSchema.statics.getActiveSettings = async function() {
    return await this.findOne({ isActive: true }).populate('lastUpdatedBy', 'name email');
};

// Static method to create or update organization settings
organizationSettingSchema.statics.createOrUpdate = async function(data, userId) {
    // Find the most recent organization settings record
    let existingSettings = await this.findOne().sort({ createdAt: -1 });
    
    if (existingSettings) {
        // Update the existing record
        existingSettings.organizationName = data.organizationName;
        existingSettings.organizationAddress = data.organizationAddress;
        existingSettings.organizationEmail = data.organizationEmail;
        existingSettings.organizationTIN = data.organizationTIN;
        existingSettings.organizationVRN = data.organizationVRN;
        existingSettings.companyStamp = data.companyStamp;
        existingSettings.importantPhoneNumbers = data.importantPhoneNumbers;
        existingSettings.directors = data.directors;
        existingSettings.organizationLogo = data.organizationLogo;
        existingSettings.letterheadTop = data.letterheadTop;
        existingSettings.letterheadBottom = data.letterheadBottom;
        existingSettings.lastUpdatedBy = userId;
        existingSettings.updatedAt = new Date();
        
        return await existingSettings.save();
    } else {
        // Create new settings if none exist
        const newSettings = new this({
            ...data,
            lastUpdatedBy: userId,
            isActive: true
        });
        
        return await newSettings.save();
    }
};

// Instance method to get formatted phone numbers
organizationSettingSchema.methods.getFormattedPhoneNumbers = function() {
    if (!this.importantPhoneNumbers) return '';
    
    // Convert line breaks to HTML for display
    return this.importantPhoneNumbers.replace(/\n/g, '<br>');
};

// Instance method to get directors with signatures
organizationSettingSchema.methods.getDirectorsWithSignatures = function() {
    return this.directors.filter(director => director.name && director.name.trim() !== '');
};

const OrganizationSetting = mongoose.models.OrganizationSetting || mongoose.model('OrganizationSetting', organizationSettingSchema);

export default OrganizationSetting;
