import { Certificate } from '../models/Certificate.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const listPublic = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = { published: true }
    if (req.query.category) filter.category = req.query.category
    if (req.query.q) filter.$text = { $search: req.query.q }

    const [items, total] = await Promise.all([
        Certificate.find(filter).sort({ order: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Certificate.countDocuments(filter),
    ])
    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const listAdmin = asyncHandler(async (_req, res) => {
    const items = await Certificate.find().sort({ order: 1, createdAt: -1 }).lean()
    res.json({ success: true, data: items })
})

export const create = asyncHandler(async (req, res) => {
    const cert = await Certificate.create(req.body)
    res.status(201).json({ success: true, data: cert })
})

export const update = asyncHandler(async (req, res) => {
    const cert = await Certificate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!cert) throw ApiError.notFound('Certificate not found')
    res.json({ success: true, data: cert })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await Certificate.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Certificate not found')
    res.json({ success: true })
})
