import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment validation.
 *
 * Process exits immediately if anything required is missing or malformed,
 * so we never start the server in a broken state. This is one of the
 * cheapest production wins you can give yourself.
 */
const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    // Mongo
    MONGODB_URI: z.string().url('MONGODB_URI must be a valid mongodb URI'),

    // Auth
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // CORS / cookies
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    COOKIE_DOMAIN: z.string().optional(),

    // Email — preferred: Resend (HTTPS, works on Render free tier).
    // Get a free API key at https://resend.com (3,000 emails/month free).
    RESEND_API_KEY: z.string().optional(),

    // Email fallback (Nodemailer over SMTP — Gmail App Password). Note: many
    // free hosts (incl. Render free tier) BLOCK outbound SMTP, so prefer Resend
    // in production. See SETUP-EMAIL.md.
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
        .string()
        .default('false')
        .transform(v => v === 'true'),
    SMTP_USER: z.string().email().optional(),       // your full gmail address
    SMTP_PASS: z.string().optional(),               // 16-char Gmail App Password
    // Default From. With no verified domain on Resend, you MUST send from
    // "onboarding@resend.dev". Once you verify your own domain, switch this to
    // something like "Portfolio <hello@yourdomain.com>".
    MAIL_FROM: z.string().default('Portfolio Contact <onboarding@resend.dev>'),
    MAIL_TO_ADMIN: z.string().email().optional(),   // where new messages land (your gmail)

    // Cloudinary (image uploads). Optional — uploads endpoint 503s if missing.
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // Bootstrap admin (used only by seedAdmin)
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
    SEED_ADMIN_NAME: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
    console.error('\n[FATAL] Invalid environment configuration:\n')
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    console.error('\nFix your .env file and try again.\n')
    process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'