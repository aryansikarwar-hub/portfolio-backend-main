import mongoose from 'mongoose'

const contactMessageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        subject: { type: String, default: '', maxlength: 200 },
        message: { type: String, required: true, maxlength: 5000 },

        // For abuse triage / analytics
        ip: { type: String },
        userAgent: { type: String, maxlength: 500 },
        referrer: { type: String, maxlength: 500 },

        status: {
            type: String,
            enum: ['new', 'read', 'replied', 'archived', 'spam'],
            default: 'new',
            index: true,
        },
        adminNotes: { type: String, default: '' },
    },
    { timestamps: true }
)

contactMessageSchema.index({ createdAt: -1 })

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema)
