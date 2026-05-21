import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

// =========================================================================
//  EMAIL SENDING
//
//  Two backends, picked automatically:
//
//  1. RESEND (preferred)  — set RESEND_API_KEY. Sends over plain HTTPS
//     (port 443), so it works on hosts like Render's free tier that block
//     outbound SMTP ports (25/465/587). This is the reliable path in prod.
//
//  2. SMTP (fallback)     — set SMTP_USER + SMTP_PASS (e.g. a Gmail App
//     Password). Works great locally / on hosts that allow SMTP.
//
//  If neither is configured, email is disabled (logged, never throws).
// =========================================================================

// ---- Backend 1: Resend (HTTP API) ---------------------------------------

async function sendViaResend({ to, subject, html, text, replyTo, from }) {
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: from || env.MAIL_FROM,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text: text || stripHtml(html),
                ...(replyTo ? { reply_to: replyTo } : {}),
            }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const reason = data?.message || data?.error?.message || `HTTP ${res.status}`
            logger.error('Resend send failed', { to, subject, reason })
            return { ok: false, reason }
        }
        logger.info('Email sent via Resend', { to, subject, id: data?.id })
        return { ok: true, messageId: data?.id }
    } catch (err) {
        logger.error('Resend send threw', { to, subject, message: err.message })
        return { ok: false, reason: err.message }
    }
}

// ---- Backend 2: SMTP (Nodemailer) ---------------------------------------

let transporter = null
let initPromise = null

function buildTransporter() {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
        logger.warn('SMTP_USER / SMTP_PASS not set — SMTP backend disabled')
        return null
    }

    // If we're talking to Gmail, use Nodemailer's built-in "gmail" service.
    const isGmail = /gmail\.com$/i.test(env.SMTP_HOST || '') ||
        /@gmail\.com$/i.test(env.SMTP_USER || '')

    if (isGmail) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        })
    }

    return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
}

async function getTransporter() {
    if (transporter) return transporter
    if (initPromise) return initPromise

    initPromise = (async () => {
        const t = buildTransporter()
        if (!t) return null
        try {
            await t.verify()
            logger.info('SMTP transport verified')
            transporter = t
            return t
        } catch (err) {
            logger.error('SMTP transport verification failed', { message: err.message })
            initPromise = null
            return null
        }
    })()
    return initPromise
}

async function sendViaSmtp({ to, subject, html, text, replyTo, from }) {
    const t = await getTransporter()
    if (!t) return { ok: false, reason: 'email_disabled' }
    try {
        const info = await t.sendMail({
            from: from || env.MAIL_FROM,
            to,
            subject,
            html,
            text: text || stripHtml(html),
            replyTo,
        })
        logger.info('Email sent via SMTP', { to, subject, messageId: info.messageId })
        return { ok: true, messageId: info.messageId }
    } catch (err) {
        logger.error('SMTP send failed', { to, subject, message: err.message })
        return { ok: false, reason: err.message }
    }
}

// ---- Public API ---------------------------------------------------------

/**
 * Generic send. Returns { ok: true } on success, or { ok: false, reason }.
 * Prefers Resend (HTTPS, host-friendly), falls back to SMTP. Never throws.
 */
export async function sendMail(opts) {
    if (env.RESEND_API_KEY) {
        return sendViaResend(opts)
    }
    if (env.SMTP_USER && env.SMTP_PASS) {
        return sendViaSmtp(opts)
    }
    logger.warn('No email backend configured (set RESEND_API_KEY or SMTP_USER/PASS)')
    return { ok: false, reason: 'email_disabled' }
}

function stripHtml(html = '') {
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

// --- Templates -----------------------------------------------------------
// Tiny inline templates. For anything fancier, swap in react-email or mjml.

const wrap = (title, body) => `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#06070a;color:#e6e3da;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;margin:0 0 16px;color:#fff;">${escape(title)}</h1>
    <div style="line-height:1.6;font-size:15px;">${body}</div>
    <hr style="border:0;border-top:1px solid #1f2229;margin:32px 0;">
    <p style="font-size:12px;color:#7d7a72;">Aryan Sikarwar · Portfolio</p>
  </div>
</body>
</html>`

function escape(s = '') {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

export const emails = {
    contactAdmin: ({ name, email, subject, message }) => ({
        subject: `📩 New contact message from ${name}${subject ? ` — ${subject}` : ''}`,
        html: wrap(
            'New contact form submission',
            `<p>You just received a new message through your portfolio contact form.</p>
             <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
               <tr><td style="padding:6px 0;color:#7d7a72;width:90px;">Name</td><td style="padding:6px 0;"><strong>${escape(name)}</strong></td></tr>
               <tr><td style="padding:6px 0;color:#7d7a72;">Email</td><td style="padding:6px 0;"><a style="color:#8ab4ff;" href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
               <tr><td style="padding:6px 0;color:#7d7a72;">Subject</td><td style="padding:6px 0;">${escape(subject || '—')}</td></tr>
             </table>
             <p style="margin:0 0 6px;color:#7d7a72;font-size:13px;">Message</p>
             <p style="white-space:pre-wrap;background:#0f1117;padding:16px;border-radius:8px;margin:0 0 20px;">${escape(message)}</p>
             <p><a href="mailto:${escape(email)}?subject=${encodeURIComponent('Re: ' + (subject || 'Your message'))}" style="display:inline-block;background:#fff;color:#06070a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Reply to ${escape(name.split(' ')[0] || 'them')}</a></p>`
        ),
    }),

    contactAutoReply: ({ name }) => ({
        subject: 'Thanks for reaching out',
        html: wrap(
            `Hey ${escape(name?.split(' ')[0] || 'there')} 👋`,
            `<p>Your message landed in my inbox. I read every one personally and I'll get back to you within 1–2 days.</p>
             <p>In the meantime, feel free to browse the latest projects and blog posts.</p>
             <p>— Aryan</p>`
        ),
    }),

    newsletterConfirm: ({ confirmUrl }) => ({
        subject: 'Confirm your subscription',
        html: wrap(
            'Confirm your subscription',
            `<p>Click the button below to confirm you'd like to receive new posts and project updates.</p>
             <p><a href="${confirmUrl}" style="display:inline-block;background:#fff;color:#06070a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Confirm subscription</a></p>
             <p style="font-size:12px;color:#7d7a72;">If you didn't sign up, ignore this email.</p>`
        ),
    }),

    newsletterWelcome: () => ({
        subject: "You're in 🎉",
        html: wrap(
            'Subscription confirmed',
            `<p>Thanks for subscribing! You'll get new posts and project drops here — no spam, easy unsubscribe in every email.</p>`
        ),
    }),

    commentReply: ({ post, comment }) => ({
        subject: `New reply on "${post.title}"`,
        html: wrap(
            'You got a reply',
            `<p><strong>${escape(comment.author)}</strong> replied to your comment:</p>
             <blockquote style="border-left:3px solid #444;padding-left:12px;color:#bdbab1;">${escape(comment.body)}</blockquote>`
        ),
    }),
}