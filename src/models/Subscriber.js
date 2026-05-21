import mongoose from 'mongoose'
import crypto from 'node:crypto'

const subscriberSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        name: { type: String, default: '', maxlength: 100 },
        source: { type: String, default: 'footer' }, // where they signed up

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'unsubscribed'],
            default: 'pending',
            index: true,
        },
        // Single random token used for both the confirm and unsubscribe links.
        // We rotate it on unsubscribe so the old link can't be re-used.
        token: { type: String, default: () => crypto.randomBytes(24).toString('hex'), index: true },
        confirmedAt: { type: Date },
        unsubscribedAt: { type: Date },
        ip: { type: String },
    },
    { timestamps: true }
)

export const Subscriber = mongoose.model('Subscriber', subscriberSchema)
