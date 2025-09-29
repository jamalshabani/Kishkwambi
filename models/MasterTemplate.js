import mongoose from 'mongoose';

const masterTemplateSchema = new mongoose.Schema({

    htmlContent: {
        type: String,
        required: [true, 'HTML content is required']
    },
}, {
    timestamps: true
});


const MasterTemplate = mongoose.models.MasterTemplate || mongoose.model('MasterTemplate', masterTemplateSchema);

export default MasterTemplate;
