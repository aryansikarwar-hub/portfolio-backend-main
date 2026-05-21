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

    // 1) Best-effort persist. We don't want a Mongo hiccup to stop the email
    //    from reaching your inbox — the email is the part that actually matters
    //    to you. If the DB is unavailable we log it and carry on.
    let savedId = null
    let savedAt = new Date()
    try {
        const saved = await ContactMessage.create({
            name,
            email,
            subject,
            message,
            ip: req.ip,
            userAgent: req.get('user-agent') || '',
            referrer: req.get('referer') || '',
        })
        savedId = saved._id
        savedAt = saved.createdAt
    } catch (err) {
        logger.error('ContactMessage save failed (continuing to email)', { message: err.message })
    }

    // 2) Send the admin notification to YOUR inbox, and wait for the result so
    //    we can tell the user honestly whether it went through.
    const adminTo = env.MAIL_TO_ADMIN || env.SMTP_USER
    let emailDelivered = false

    if (adminTo) {
        const tpl = emails.contactAdmin({ name, email, subject, message })
        const result = await sendMail({ to: adminTo, ...tpl, replyTo: email })
        emailDelivered = result.ok
        if (!result.ok) {
            logger.error('contactAdmin email failed', { reason: result.reason })
        }
    } else {
        logger.warn('No MAIL_TO_ADMIN / SMTP_USER configured — admin email skipped')
    }

    // 3) Fire-and-forget auto-reply to the sender. Failure here is non-fatal.
    const reply = emails.contactAutoReply({ name })
    sendMail({ to: email, ...reply })
        .catch(err => logger.error('contactAutoReply email failed', { message: err.message }))

    // If nothing was stored AND the email didn't go out, the submission is lost
    // — surface a real error so the user can retry instead of getting a false
    // "success" toast.
    if (!savedId && !emailDelivered) {
        throw ApiError.internal('Could not deliver your message right now. Please try again or email me directly.')
    }

    res.status(201).json({
        success: true,
        data: { id: savedId, createdAt: savedAt, emailDelivered },
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