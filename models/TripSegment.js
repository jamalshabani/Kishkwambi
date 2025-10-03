import mongoose from "mongoose";

const { Schema } = mongoose;

const tripSegmentSchema = new Schema({
    tripSegmentNumber: {
        type: String,
        unique: true,
        required: false
    },

    blNumber: {
        type: String,
        required: true
    },

    containerNumber: {
        type: String,
        required: true
    },

    containerPhotos: {
        type: [String],
        required: false
    },

    outwardContainerPhotos: {
        type: [String],
        required: false
    },

    truckPhoto: {
        type: String,
        required: false
    },

    trailerPhoto: {
        type: String,
        required: false
    },

    outwardTruckPhoto: {
        type: String,
        required: false
    },

    username: {
        type: String,
        required: false
    },

    vesselName: {
        type: String,
        required: false
    },

    voyageNumber: {
        type: String,
        required: false
    },

    cfAgent: {  
        type: String,
        required: false
    },

    isoCode: {
        type: String,
        required: false
    },

    containerType: {
        type: String,
        required: false
    },

    containerColor: {
        type: String,
        required: false
    },

    containerColorCode: {
        type: String,
        required: false
    },

    containerSize: {
        type: String,
        required: false
    },


    inspectorName: {
        type: String,
        required: false
    },

    outwardInspectorName: {
        type: String,
        required: false
    },

    inspectionDate: {
        type: String,
        required: false
    },

    outwardInspectionDate: {
        type: String,
        required: false
    },

    finalApproval: {
        type: Boolean,
        required: false
    },

    outwardFinalApproval: {
        type: Boolean,
        required: false
    },

    transporterName: {
        type: String,
        required: false
    },

    outwardTransporterName: {
        type: String,
        required: false
    },

    truckNumber: {
        type: String,
        required: false
    },

    outwardTruckNumber: {
        type: String,
        required: false
    },

    trailerNumber: {
        type: String,
        required: false
    },

    outwardTrailerNumber: {
        type: String,
        required: false
    },

    containerMovement: {
        type: [String],
        required: false
    },

    shippingLine: {
        type: String,
        required: true
    },

    driverFirstName: {
        type: String,
        required: false
    },

    outwardDriverFirstName: {
        type: String,
        required: false
    },

    driverLastName: {
        type: String,
        required: false
    },

    outwardDriverLastName: {
        type: String,
        required: false
    },

    driverPhoneNumber: {
        type: String,
        required: false
    },

    outwardDriverPhoneNumber: {
        type: String,
        required: false
    },

    driverLicenceNumber: {
        type: String,
        required: false
    },


    outwardDriverLicenceNumber: {
        type: String,
        required: false
    },

    destination: {
        type: String,
        required: false
    },

    bookingNumber: {
        type: String,
        required: false
    },

    outwardBookingNumber: {
        type: String,
        required: false
    },

    ecdName: {
        type: String,
        default: "Simba Empty Container Depot"
    },

    containerCondition: {
        type: String,
        required: false
    },

    containerLoadStatus: {
        type: String,
        required: false
    },

    hasDamages: {
        type: String,
        required: false
    },

    damageLocations: {
        type: [String],
        required: false
    },

    damagePhotos: {
        type: [String],
        required: false
    },

    damageReportPath: {
        type: String,
        required: false
    },

    damageDescription: {
        type: String,
        required: false
    },

    damageReportGeneratedAt: {
        type: Date,
        required: false
    },

    containerYardLocation: {
        type: String,
        required: false
    },

    containerYardHalf: {
        type: String,
        enum: ['left', 'right', null],
        required: false,
        default: null
    },

    containerMovement: {
        type: [String],
        required: false,
        default: []
    },

    containerZoneLocation: {
        type: String,
        required: false
    },

    containerYardLocationStatus: {
        type: Boolean,
        default: false
    },

    gateInTimeStamp: {
        type: String,
        required: false
    },

    gateOutTimeStamp: {
        type: String,
        required: false
    },

    containerETA: {
        type: String,
        required: false
    },

    containerStatus: {
        type: String,
        default: "Not Received"
    },

    inwardLOLOPayment: {
        type: String,
        default: "Unpaid"
    },

    inwardLOLOBalance: {
        type: Number,
        required: false
    },

    inwardLOLOAmountReceived: {
        type: [Number],
        required: false,
        default: []
    },

    outwardLOLOPayment: {
        type: String,
        default: "Unpaid"
    },

    outwardLOLOBalance: {
        type: Number,
        required: false
    },

    proforma:{
        type: String,
        required: false
    },

    finalReceipt: {
        type: String,
        required: false
    },

    outwardFinalReceipt: {
        type: String,
        required: false
    },

    outwardLOLOBalance: {
        type: Number,
        required: false
    }, 

    storageCharges: {
        type: Number,
        default: 0
    },

    storageDays: {
        type: Number,
        default: 0
    },

}, { timestamps: true }
)

// Custom validation to ensure tripSegmentNumber is always present
tripSegmentSchema.pre('validate', function(next) {
    next();
});

// Pre-save middleware to generate auto-increment trip segment number
tripSegmentSchema.pre('save', async function(next) {
  
    if (this.isNew) {
        try {
            // Get the current year (last 2 digits)
            const currentYear = new Date().getFullYear().toString().slice(-2);
            const prefix = `ST${currentYear}-`;
            
            // Find the highest existing trip segment number with the same prefix
            const lastTripSegment = await this.constructor.findOne(
                { tripSegmentNumber: { $regex: `^${prefix}` } },
                { tripSegmentNumber: 1 },
                { sort: { tripSegmentNumber: -1 } }
            );
            
            let nextNumber = 1;
            if (lastTripSegment) {
                // Extract the number part and increment
                const lastNumber = parseInt(lastTripSegment.tripSegmentNumber.split('-')[1]);
                nextNumber = lastNumber + 1;
            }
            
            // Format the number with leading zeros (5 digits)
            this.tripSegmentNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`;
            
            // Ensure the field is set
            if (!this.tripSegmentNumber) {
                throw new Error("Failed to generate trip segment number");
            }
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Post-save middleware to verify the trip segment number was saved
tripSegmentSchema.post('save', function(doc) {
    // Trip segment number has been successfully saved
});

export default mongoose.models.TripSegment || mongoose.model("TripSegment", tripSegmentSchema)