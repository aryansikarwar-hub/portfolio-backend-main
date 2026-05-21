import { BlogPost } from '../models/BlogPost.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { makeUniqueSlug } from '../utils/slugify.js'

function buildPublicFilter(query) {
    const filter = { published: true }
    if (query.category) filter.category = query.category
    if (query.tag) filter.tags = query.tag
    if (query.featured !== undefined) filter.featured = query.featured
    if (query.q) filter.$text = { $search: query.q }
    return filter
}

export const listPublic = asyncHandler(async (req, res) => {
    const { page, limit, sort } = req.query
    const filter = buildPublicFilter(req.query)

    const sortSpec = sort
        ? { [sort.replace(/^-/, '')]: sort.startsWith('-') ? -1 : 1 }
        : { featured: -1, publishedAt: -1 }

    const [items, total] = await Promise.all([
        BlogPost.find(filter)
            // Strip content from list responses — saves bytes; details fetch
            // the full post anyway.
            .select('-content')
            .sort(sortSpec)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        BlogPost.countDocuments(filter),
    ])

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const getPublicBySlug = asyncHandler(async (req, res) => {
    // findOneAndUpdate so the view count and the doc fetch share one round-trip.
    const post = await BlogPost.findOneAndUpdate(
        { slug: req.params.slug, published: true },
        { $inc: { views: 1 } },
        { new: true }
    ).lean()
    if (!post) throw ApiError.notFound('Post not found')
    res.json({ success: true, data: post })
})

export const like = asyncHandler(async (req, res) => {
    const post = await BlogPost.findOneAndUpdate(
        { slug: req.params.slug, published: true },
        { $inc: { likes: 1 } },
        { new: true, projection: 'likes' }
    ).lean()
    if (!post) throw ApiError.notFound('Post not found')
    res.json({ success: true, data: { likes: post.likes } })
})

export const listAdmin = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = {}
    if (req.query.q) filter.$text = { $search: req.query.q }
    const [items, total] = await Promise.all([
        BlogPost.find(filter)
            .select('-content')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        BlogPost.countDocuments(filter),
    ])
    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const getAdminById = asyncHandler(async (req, res) => {
    const post = await BlogPost.findById(req.params.id).lean()
    if (!post) throw ApiError.notFound('Post not found')
    res.json({ success: true, data: post })
})

export const create = asyncHandler(async (req, res) => {
    const body = req.body
    const slug = await makeUniqueSlug(BlogPost, body.slug || body.title)
    const post = await BlogPost.create({
        ...body,
        slug,
        author: req.user._id,
    })
    res.status(201).json({ success: true, data: post })
})

export const update = asyncHandler(async (req, res) => {
    const existing = await BlogPost.findById(req.params.id)
    if (!existing) throw ApiError.notFound('Post not found')

    const updates = { ...req.body }
    if (req.body.slug && req.body.slug !== existing.slug) {
        updates.slug = await makeUniqueSlug(BlogPost, req.body.slug, existing._id)
    }

    Object.assign(existing, updates)
    await existing.save()
    res.json({ success: true, data: existing })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await BlogPost.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Post not found')
    res.json({ success: true })
})
