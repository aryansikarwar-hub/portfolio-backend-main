import { ContactMessage } from '../models/ContactMessage.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendMail, emails } from '../services/email.service.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const submit = asyncHandler(async (req, res) => {
    // Honeypot: silent reject — return success so the bot keeps thinking it worked.
    if (req.body.website && req.body.website.length > 0) {
        logger.warn('Contact honeypot triggered', { ip: req.ip })
        return res.status(202).json({ success: true })
    }

    const { name, email, subject, message } = req.body

    const saved = await ContactMessage.create({
        name,
        email,
        subject,
        message,
        ip: req.ip,
        userAgent: req.get('user-agent') || '',
        referrer: req.get('referer') || '',
    })

    // Fire-and-forget emails — we don't make the user wait on SMTP, and
    // we don't fail the request if the email layer is misconfigured.
    if (env.MAIL_TO_ADMIN) {
        const tpl = emails.contactAdmin({ name, email, subject, message })
        sendMail({ to: env.MAIL_TO_ADMIN, ...tpl, replyTo: email })
            .catch(err => logger.error('contactAdmin email failed', { message: err.message }))
    }

    const reply = emails.contactAutoReply({ name })
    sendMail({ to: email, ...reply })
        .catch(err => logger.error('contactAutoReply email failed', { message: err.message }))

    res.status(201).json({
        success: true,
        data: { id: saved._id, createdAt: saved.createdAt },
        message: "Message received. I'll get back to you within 1-2 days.",
    })
})

export const listAdmin = asyncHandler(async (req, res) => {
    const { page, limit } = req.query
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const [items, total] = await Promise.all([
        ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ContactMessage.countDocuments(filter),
    ])
    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
})

export const setStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes } = req.body
    const updated = await ContactMessage.findByIdAndUpdate(
        req.params.id,
        { status, ...(adminNotes !== undefined && { adminNotes }) },
        { new: true }
    )
    if (!updated) throw ApiError.notFound('Message not found')
    res.json({ success: true, data: updated })
})

export const remove = asyncHandler(async (req, res) => {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id)
    if (!deleted) throw ApiError.notFound('Message not found')
    res.json({ success: true })
})
