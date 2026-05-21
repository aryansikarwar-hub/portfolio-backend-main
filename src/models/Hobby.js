import mongoose from 'mongoose'

const hobbySchema = new mongoose.Schema(
    {
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        name: { type: String, required: true, trim: true },
        title: { type: String, default: '' },
        title2: { type: String, default: '' },
        icon: { type: String, default: '' }, // lucide-react icon name
        accent: { type: String, default: '#888888' },
        color: { type: String, default: '#888888' },
        place: { type: String, default: '' },
        role: { type: String, default: '' },
        language: { type: String, default: '' },
        year: { type: String, default: '' },
        gradient: { type: String, default: '' },

        shortDesc: { type: String, default: '' },
        description: { type: String, default: '' },

        tags: { type: [String], default: [] },
        highlights: { type: [String], default: [] },
        stats: { type: [mongoose.Schema.Types.Mixed], default: [] },
        gallery: { type: [mongoose.Schema.Types.Mixed], default: [] },
        meta: { type: mongoose.Schema.Types.Mixed },

        published: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
)

hobbySchema.index({ name: 'text', description: 'text', tags: 'text' })

export const Hobby = mongoose.model('Hobby', hobbySchema)
