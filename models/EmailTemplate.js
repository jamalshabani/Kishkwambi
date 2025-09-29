import mongoose from "mongoose";

const { Schema } = mongoose;

const emailTemplateSchema = new Schema({
    emailTemplateTitle: {
        type: String,
        required: true,
        unique: true
    },

    emailTemplateSection: {
        type: String,
        required: true
    },


    emailTemplateSubject: {
        type: String,
        required: true
    },


    emailTemplateHeading: {
        type: String,
        required: true
    },


    emailTemplateBody: {
        type: String,
        required: true
    },

}, { timestamps: true }
)

export default mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", emailTemplateSchema)