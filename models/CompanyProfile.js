import mongoose from "mongoose";
import { type } from "os";

const { Schema } = mongoose;

const companyProfileSchema = new Schema({
    companyName: {
        type: String,
        required: true
    },

    companyAddress: {
        type: String,
        required: true
    },

    companyAddressLine2: {
        type: String,
        required: false
    },

    companyAddressLine3: {
        type: String,
        required: false
    },

    companyLogo: {
        type: String,
        required: false
    },

    companyCity: {
        type: String,
        required: true
    },

    companyCountry: {
        type: String,
        required: true
    },

    companyPhoneNumber: {
        type: String,
        required: true
    },

    companyEmail: {
        type: String,
        required: true
    },

    defaultCurrency: {
        type: String,
        required: true
    },

    companyType: {
        type: [String],
        required: true
    },

    freeDays: {
        type: String,
        required: false,
        default: 0
    },
    
    paymentTerms: {
        type: String,
        required: false,
        default: 0
    },
    
    loloRate: {
        type: String,
        required: false,
        default: 0
    },
    
    tranferRate: {
        type: String,
        required: false,
        default: 0
    },
    
    demurrageRate: {
        type: String,
        required: false,
        default: 0
    },
    
    bankName: {
        type: String,
        required: false,
        default: ''
    },
    
    bankCountry: {
        type: String,
        required: false,
        default: ''
    },

    accountNumber: {
        type: String,
        required: false,
        default: ''
    },
    
    swiftCode: {
        type: String,
        required: false,
        default: ''
    },

    xeroId: {
        type: String,
        required: false,
        default: ''
    },

    isActive: {
        type: String,
        required: false,
        default: 'Yes'
    },

    dailyReports: [{
        title: {
            type: String,
            required: true
        },
        filename: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: false,
            default: 0
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],

    companyFiles: [{
        title: {
            type: String,
            required: true
        },
        filename: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: false,
            default: 0
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],

}, { timestamps: true }
)

export default mongoose.models.CompanyProfile || mongoose.model("CompanyProfile", companyProfileSchema)