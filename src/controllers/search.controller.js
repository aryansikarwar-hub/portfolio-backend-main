import { Project } from '../models/Project.js'
import { BlogPost } from '../models/BlogPost.js'
import { Hobby } from '../models/Hobby.js'
import { Certificate } from '../models/Certificate.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * Cheap fan-out search across the public catalogue. Each model runs a
 * $text query in parallel; results are merged client-side. Scales fine
 * for portfolio-sized data; swap for Atlas Search if it ever grows.
 */
export const search = asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json({ success: true, data: { results: [] } })

    const limit = Math.min(parseInt(req.query.limit) || 10, 25)
    const filter = { $text: { $search: q }, published: true }
    const projection = { score: { $meta: 'textScore' } }
    const sort = { score: { $meta: 'textScore' } }

    const [projects, posts, hobbies, certs] = await Promise.all([
        Project.find(filter, projection).sort(sort).limit(limit)
            .select('slug name subtitle accent thumbnail tech')
            .lean(),
        BlogPost.find(filter, projection).sort(sort).limit(limit)
            .select('slug title excerpt category color tags publishedAt')
            .lean(),
        Hobby.find(filter, projection).sort(sort).limit(limit)
            .select('slug name shortDesc accent icon')
            .lean(),
        Certificate.find(filter, projection).sort(sort).limit(limit)
            .select('title issuer category thumbnail credentialUrl')
            .lean(),
    ])

    const tag = (kind, items) => items.map(it => ({ kind, ...it }))
    const results = [
        ...tag('project', projects),
        ...tag('post', posts),
        ...tag('hobby', hobbies),
        ...tag('certificate', certs),
    ]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit)

    res.json({ success: true, data: { query: q, results } })
})
