import { Project } from '../models/Project.js'
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

    // Default sort: featured first, then explicit order, then newest.
    const sortSpec = sort
        ? { [sort.replace(/^-/, '')]: sort.startsWith('-') ? -1 : 1 }
        : { featured: -1, order: 1, createdAt: -1 }

    const [items, total] = await Promise.all([
        Project.find(filter)
            .sort(sortSpec)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Project.countDocuments(filter),
    ])

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const getPublicBySlug = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ slug: req.params.slug, published: true }).lean()
    if (!project) throw ApiError.notFound('Project not found')
    res.json({ success: true, data: project })
})

export const listAdmin = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = {}
    if (req.query.q) filter.$text = { $search: req.query.q }

    const [items, total] = await Promise.all([
        Project.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Project.countDocuments(filter),
    ])

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const create = asyncHandler(async (req, res) => {
    const body = req.body
    const slug = await makeUniqueSlug(Project, body.slug || body.name)
    const project = await Project.create({
        ...body,
        slug,
        createdBy: req.user._id,
        updatedBy: req.user._id,
    })
    res.status(201).json({ success: true, data: project })
})

export const update = asyncHandler(async (req, res) => {
    const existing = await Project.findById(req.params.id)
    if (!existing) throw ApiError.notFound('Project not found')

    const updates = { ...req.body, updatedBy: req.user._id }

    // Re-slug only if the caller passed a new slug, or if the name changed
    // and the existing slug looks auto-generated from the name.
    if (req.body.slug && req.body.slug !== existing.slug) {
        updates.slug = await makeUniqueSlug(Project, req.body.slug, existing._id)
    }

    Object.assign(existing, updates)
    await existing.save()

    res.json({ success: true, data: existing })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await Project.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Project not found')
    res.json({ success: true })
})
