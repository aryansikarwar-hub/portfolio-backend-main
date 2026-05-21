import crypto from 'node:crypto'
import { PageView } from '../models/PageView.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * Daily-rotating salt so the same visitor produces the same hash within a
 * day but a different hash the next day. Keeps "unique visitors today" useful
 * without retaining any cross-day identity.
 */
function visitorHash(req) {
    const ip = req.ip || req.headers['x-forwarded-for'] || ''
    const ua = req.get('user-agent') || ''
    const day = new Date().toISOString().slice(0, 10)
    return crypto.createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex')
}

export const track = asyncHandler(async (req, res) => {
    await PageView.create({
        path: req.body.path,
        referrer: req.body.referrer || '',
        userAgent: (req.get('user-agent') || '').slice(0, 500),
        visitorHash: visitorHash(req),
    })
    // 204: noop response keeps the beacon cheap on the wire.
    res.status(204).end()
})

/** Admin dashboard aggregates: last 30 days. */
export const stats = asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [byDay, topPaths, totals] = await Promise.all([
        PageView.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    views: { $sum: 1 },
                    uniques: { $addToSet: '$visitorHash' },
                },
            },
            { $project: { _id: 0, date: '$_id', views: 1, uniques: { $size: '$uniques' } } },
            { $sort: { date: 1 } },
        ]),
        PageView.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$path', views: { $sum: 1 } } },
            { $sort: { views: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, path: '$_id', views: 1 } },
        ]),
        PageView.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: null,
                    views: { $sum: 1 },
                    uniques: { $addToSet: '$visitorHash' },
                },
            },
            { $project: { _id: 0, views: 1, uniques: { $size: '$uniques' } } },
        ]),
    ])

    res.json({
        success: true,
        data: {
            range: '30d',
            totals: totals[0] || { views: 0, uniques: 0 },
            byDay,
            topPaths,
        },
    })
})
