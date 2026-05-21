import { Hobby } from '../models/Hobby.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { makeUniqueSlug } from '../utils/slugify.js'

export const listPublic = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = { published: true }
    if (req.query.q) filter.$text = { $search: req.query.q }
    if (req.query.tag) filter.tags = req.query.tag

    const [items, total] = await Promise.all([
        Hobby.find(filter).sort({ order: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Hobby.countDocuments(filter),
    ])
    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const getPublicBySlug = asyncHandler(async (req, res) => {
    const hobby = await Hobby.findOne({ slug: req.params.slug, published: true }).lean()
    if (!hobby) throw ApiError.notFound('Hobby not found')
    res.json({ success: true, data: hobby })
})

export const listAdmin = asyncHandler(async (req, res) => {
    const items = await Hobby.find().sort({ order: 1, createdAt: -1 }).lean()
    res.json({ success: true, data: items })
})

export const create = asyncHandler(async (req, res) => {
    const slug = await makeUniqueSlug(Hobby, req.body.slug || req.body.name)
    const hobby = await Hobby.create({ ...req.body, slug })
    res.status(201).json({ success: true, data: hobby })
})

export const update = asyncHandler(async (req, res) => {
    const existing = await Hobby.findById(req.params.id)
    if (!existing) throw ApiError.notFound('Hobby not found')

    const updates = { ...req.body }
    if (req.body.slug && req.body.slug !== existing.slug) {
        updates.slug = await makeUniqueSlug(Hobby, req.body.slug, existing._id)
    }
    Object.assign(existing, updates)
    await existing.save()
    res.json({ success: true, data: existing })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await Hobby.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Hobby not found')
    res.json({ success: true })
})
