import mongoose from 'mongoose'

/**
 * Very lightweight first-party analytics. We don't store anything
 * personally identifying — the IP is hashed at the controller boundary
 * before it ever reaches this schema.
 *
 * Rolling aggregates are computed on read (admin dashboard) rather than
 * maintained as denormalised counters; for portfolio-scale traffic
 * a Mongo aggregation over recent docs is more than fast enough.
 */
const pageViewSchema = new mongoose.Schema(
    {
        path: { type: String, required: true, index: true },
        referrer: { type: String, default: '' },
        userAgent: { type: String, default: '', maxlength: 500 },
        // Hashed (sha256 + daily salt) — sufficient for "unique visitors today"
        // without retaining a real identifier.
        visitorHash: { type: String, index: true },
        country: { type: String, default: '' }, // populated if you add a geo lookup
        createdAt: { type: Date, default: Date.now, index: true, expires: '180d' },
    },
    { timestamps: false, versionKey: false }
)

pageViewSchema.index({ path: 1, createdAt: -1 })

export const PageView = mongoose.model('PageView', pageViewSchema)
