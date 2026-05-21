import { Comment } from '../models/Comment.js'
import { BlogPost } from '../models/BlogPost.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { logger } from '../utils/logger.js'

/** List approved comments for a blog post (public). */
export const listForPost = asyncHandler(async (req, res) => {
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true }).select('_id')
    if (!post) throw ApiError.notFound('Post not found')

    const comments = await Comment.find({ post: post._id, status: 'approved' })
        .sort({ createdAt: 1 })
        .lean()

    res.json({
        success: true,
        data: comments.map(c => ({
            _id: c._id,
            post: c.post,
            parent: c.parent,
            author: c.author,
            body: c.body,
            createdAt: c.createdAt,
        })),
    })
})

/** Create a comment (public, pending moderation). */
export const create = asyncHandler(async (req, res) => {
    if (req.body.company && req.body.company.length > 0) {
        logger.warn('Comment honeypot triggered', { ip: req.ip })
        return res.status(202).json({ success: true })
    }

    const post = await BlogPost.findOne({ slug: req.params.slug, published: true }).select('_id')
    if (!post) throw ApiError.notFound('Post not found')

    if (req.body.parent) {
        const parent = await Comment.findOne({
            _id: req.body.parent,
            post: post._id,
            status: 'approved',
        })
        if (!parent) throw ApiError.badRequest('Parent comment not found or not approved')
    }

    const comment = await Comment.create({
        post: post._id,
        parent: req.body.parent || null,
        author: req.body.author,
        email: req.body.email,
        website: req.body.website,
        body: req.body.body,
        ip: req.ip,
        userAgent: req.get('user-agent') || '',
    })

    res.status(201).json({
        success: true,
        message: 'Your comment has been submitted and will appear after review.',
        data: { id: comment._id },
    })
})

// ---- Admin moderation ---------------------------------------------------

export const listAdmin = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const [items, total] = await Promise.all([
        Comment.find(filter).populate('post', 'title slug').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Comment.countDocuments(filter),
    ])

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const moderate = asyncHandler(async (req, res) => {
    const updated = await Comment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    if (!updated) throw ApiError.notFound('Comment not found')
    res.json({ success: true, data: updated })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await Comment.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Comment not found')
    res.json({ success: true })
})
