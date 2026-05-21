import crypto from 'node:crypto'
import { Subscriber } from '../models/Subscriber.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendMail, emails } from '../services/email.service.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const subscribe = asyncHandler(async (req, res) => {
    const { email, name, source } = req.body

    // Upsert keeps the same record across re-signups (idempotent).
    const existing = await Subscriber.findOne({ email })
    let sub
    if (existing) {
        // Already confirmed? Treat as success — don't leak that they exist.
        if (existing.status === 'confirmed') {
            return res.json({ success: true, message: "You're already subscribed." })
        }
        // Reissue token so the old one is dead.
        existing.token = crypto.randomBytes(24).toString('hex')
        existing.name = name || existing.name
        existing.source = source || existing.source
        existing.status = 'pending'
        existing.ip = req.ip
        sub = await existing.save()
    } else {
        sub = await Subscriber.create({
            email,
            name,
            source: source || 'website',
            ip: req.ip,
        })
    }

    const confirmUrl = `${env.FRONTEND_URL}/newsletter/confirm?token=${sub.token}`
    const tpl = emails.newsletterConfirm({ confirmUrl })
    sendMail({ to: sub.email, ...tpl }).catch(err =>
        logger.error('newsletterConfirm email failed', { message: err.message })
    )

    res.status(201).json({
        success: true,
        message: 'Check your inbox to confirm your subscription.',
    })
})

export const confirm = asyncHandler(async (req, res) => {
    const { token } = req.query
    if (!token) throw ApiError.badRequest('Missing token')

    const sub = await Subscriber.findOne({ token: String(token) })
    if (!sub) throw ApiError.notFound('Invalid or expired token')

    if (sub.status !== 'confirmed') {
        sub.status = 'confirmed'
        sub.confirmedAt = new Date()
        // Rotate so a leaked confirmation link can't be reused as a "log-in".
        sub.token = crypto.randomBytes(24).toString('hex')
        await sub.save()

        const welcome = emails.newsletterWelcome()
        sendMail({ to: sub.email, ...welcome }).catch(err =>
            logger.error('newsletterWelcome email failed', { message: err.message })
        )
    }

    res.json({ success: true, message: 'Subscription confirmed. Welcome!' })
})

export const unsubscribe = asyncHandler(async (req, res) => {
    const { token } = req.query
    if (!token) throw ApiError.badRequest('Missing token')

    const sub = await Subscriber.findOne({ token: String(token) })
    if (!sub) throw ApiError.notFound('Invalid or expired token')

    sub.status = 'unsubscribed'
    sub.unsubscribedAt = new Date()
    sub.token = crypto.randomBytes(24).toString('hex')
    await sub.save()

    res.json({ success: true, message: 'Unsubscribed. Sorry to see you go.' })
})

// ---- Admin --------------------------------------------------------------

export const listAdmin = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const [items, total] = await Promise.all([
        Subscriber.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Subscriber.countDocuments(filter),
    ])
    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await Subscriber.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Subscriber not found')
    res.json({ success: true })
})
