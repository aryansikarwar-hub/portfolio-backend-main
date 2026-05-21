import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

let transporter = null
let initPromise = null

function buildTransporter() {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
        logger.warn('SMTP_USER / SMTP_PASS not set — outbound email is disabled')
        return null
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
            // Don't keep the broken transporter — try again next call.
            initPromise = null
            return null
        }
    })()
    return initPromise
}

/**
 * Generic send. Returns true on success, false if email is disabled or
 * the send failed — callers decide whether to surface that to the user.
 * We deliberately never throw from this layer: a failed welcome email
 * shouldn't break user signup.
 */
export async function sendMail({ to, subject, html, text, replyTo, from }) {
    const t = await getTransporter()
    if (!t) return false
    try {
        await t.sendMail({
            from: from || env.MAIL_FROM,
            to,
            subject,
            html,
            text: text || stripHtml(html),
            replyTo,
        })
        return true
    } catch (err) {
        logger.error('sendMail failed', { to, subject, message: err.message })
        return false
    }
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
        subject: `New contact message: ${subject || 'No subject'}`,
        html: wrap(
            'New contact form submission',
            `<p><strong>${escape(name)}</strong> &lt;${escape(email)}&gt;</p>
             <p><strong>Subject:</strong> ${escape(subject || '—')}</p>
             <p style="white-space:pre-wrap;background:#0f1117;padding:16px;border-radius:8px;">${escape(message)}</p>`
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
