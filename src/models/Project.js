import mongoose from 'mongoose'

/**
 * Project model is intentionally permissive on the rich-content fields
 * (overview, challenge, solution, keyFeatures, process, gallery, results)
 * because the source-of-truth shape is whatever the case-study page needs
 * to render. We constrain only the indexable / queryable bits.
 */
const projectSchema = new mongoose.Schema(
    {
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        name: { type: String, required: true, trim: true },
        subtitle: { type: String, default: '' },
        description: { type: String, default: '' },

        // Listing card
        thumbnail: { type: String, default: '' },
        accent: { type: String, default: '#888888' },
        year: { type: String, default: '' },
        role: { type: String, default: '' },
        place: { type: String, default: '' },

        // Filtering / search
        tech: { type: [String], default: [] },
        tags: { type: [String], default: [] },
        category: { type: String, default: 'web', index: true },

        // External
        githubUrl: { type: String, default: '' },
        liveUrl: { type: String, default: '' },

        // Visibility / ordering
        featured: { type: Boolean, default: false, index: true },
        published: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },

        // Rich case-study sections — free shape, validated at the controller layer
        overview: { type: mongoose.Schema.Types.Mixed },
        challenge: { type: mongoose.Schema.Types.Mixed },
        solution: { type: mongoose.Schema.Types.Mixed },
        keyFeatures: { type: [mongoose.Schema.Types.Mixed], default: [] },
        process: { type: [mongoose.Schema.Types.Mixed], default: [] },
        gallery: { type: [mongoose.Schema.Types.Mixed], default: [] },
        results: { type: mongoose.Schema.Types.Mixed },
        meta: { type: mongoose.Schema.Types.Mixed }, // arbitrary extras

        // Auditing
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
)

projectSchema.index({ name: 'text', subtitle: 'text', description: 'text', tags: 'text' })
projectSchema.index({ published: 1, featured: -1, order: 1, createdAt: -1 })

export const Project = mongoose.model('Project', projectSchema)
