import mongoose from "mongoose";

const { Schema } = mongoose;

const mailingListSchema = new Schema({
    mailingListTitle: {
        type: String,
        required: true,
        unique: true
    },

    mailingListSection: {
        type: String,
        required: true
    },
    
    mailingListCompany: {
        type: String,
        required: true
    },

    mailingListEmails: {
        type: String,
        required: true
    }

}, { timestamps: true }
)

export default mongoose.models.MailingList || mongoose.model("MailingList", mailingListSchema)