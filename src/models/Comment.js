import mongoose from 'mongoose'

/**
 * Blog comments with light threading (parent ref). Each comment must be
 * approved by an admin before it shows up publicly. We track IP/UA for
 * abuse triage but never surface them on the public read endpoints.
 */
const commentSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },

        author: { type: String, required: true, trim: true, maxlength: 80 },
        email: { type: String, required: true, lowercase: true, trim: true },
        website: { type: String, default: '', maxlength: 300 },
        body: { type: String, required: true, maxlength: 3000 },

        status: {
            type: String,
            enum: ['pending', 'approved', 'spam', 'deleted'],
            default: 'pending',
            index: true,
        },

        ip: { type: String },
        userAgent: { type: String, maxlength: 500 },
    },
    { timestamps: true }
)

commentSchema.index({ post: 1, status: 1, createdAt: -1 })

commentSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        post: this.post,
        parent: this.parent,
        author: this.author,
        body: this.body,
        createdAt: this.createdAt,
        // email/ip/UA deliberately omitted
    }
}

export const Comment = mongoose.model('Comment', commentSchema)
