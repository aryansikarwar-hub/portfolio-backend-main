import mongoose from 'mongoose'

/**
 * Each blog post has a flexible `content` array of typed blocks (see the
 * frontend renderer for the supported types: h2, p, quote, list, code).
 * We don't try to schema the block shape here — keeping it Mixed lets the
 * frontend evolve without a backend migration.
 */
const blogPostSchema = new mongoose.Schema(
    {
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        title: { type: String, required: true, trim: true },
        excerpt: { type: String, default: '', maxlength: 500 },

        date: { type: String, default: '' }, // display label like "April 2026"
        publishedAt: { type: Date, default: () => new Date(), index: true },
        readTime: { type: String, default: '' },

        tags: { type: [String], default: [], index: true },
        category: { type: String, default: 'General', index: true },
        color: { type: String, default: '#888888' },

        cover: { type: String, default: '' },
        featured: { type: Boolean, default: false, index: true },
        published: { type: Boolean, default: true, index: true },

        content: { type: [mongoose.Schema.Types.Mixed], default: [] },

        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },

        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
)

blogPostSchema.index({ title: 'text', excerpt: 'text', tags: 'text', category: 'text' })
blogPostSchema.index({ published: 1, publishedAt: -1 })

export const BlogPost = mongoose.model('BlogPost', blogPostSchema)
