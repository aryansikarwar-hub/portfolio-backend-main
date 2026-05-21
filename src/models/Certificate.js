import mongoose from 'mongoose'

const certificateSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        issuer: { type: String, required: true, trim: true },
        issueDate: { type: String, default: '' }, // display label
        credentialId: { type: String, default: '' },
        credentialUrl: { type: String, default: '' },
        thumbnail: { type: String, default: '' },
        category: { type: String, default: 'General', index: true },
        skills: { type: [String], default: [] },
        published: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
)

certificateSchema.index({ title: 'text', issuer: 'text', skills: 'text' })

export const Certificate = mongoose.model('Certificate', certificateSchema)
