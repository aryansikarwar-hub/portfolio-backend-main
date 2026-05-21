import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import mongoSanitize from 'express-mongo-sanitize'
import hpp from 'hpp'

import { env, isProd } from './config/env.js'
import { httpStream } from './utils/logger.js'
import { globalLimiter } from './middleware/rateLimit.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

import authRoutes from './routes/auth.routes.js'
import projectRoutes from './routes/projects.routes.js'
import blogRoutes from './routes/blog.routes.js'
import hobbyRoutes from './routes/hobbies.routes.js'
import certRoutes from './routes/certificates.routes.js'
import contactRoutes from './routes/contact.routes.js'
import commentRoutes from './routes/comments.routes.js'
import newsletterRoutes from './routes/newsletter.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import searchRoutes from './routes/search.routes.js'
import uploadRoutes from './routes/uploads.routes.js'
import adminRoutes from './routes/admin.routes.js'

const app = express()

// Behind a reverse proxy in production (Render, Railway, Fly, Vercel) — trust
// the X-Forwarded-* headers so req.ip is the real client IP for rate limiting.
app.set('trust proxy', 1)
app.disable('x-powered-by')

// ---- Security & parsing -------------------------------------------------

app.use(
    helmet({
        contentSecurityPolicy: false, // API server, not serving HTML
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
)

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow same-origin / curl / mobile (no Origin header), plus the
            // configured frontend. Add more origins here if you fan out.
            const allowed = [env.FRONTEND_URL]
            if (!origin || allowed.includes(origin)) return cb(null, true)
            cb(new Error(`CORS blocked: ${origin}`))
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    })
)

app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())

// Defence in depth against NoSQL injection and parameter pollution.
app.use(mongoSanitize())
app.use(hpp())

// HTTP logging — concise in prod, dev format locally.
app.use(morgan(isProd ? 'combined' : 'dev', { stream: httpStream }))

// Global limiter — wide net before route-specific limiters refine it.
app.use('/api', globalLimiter)

// ---- Health -------------------------------------------------------------

app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        env: env.NODE_ENV,
    })
})

app.get('/', (_req, res) => {
    res.json({
        name: 'Aryan Sikarwar Portfolio API',
        version: '1.0.0',
        docs: '/api',
    })
})

// ---- Routes -------------------------------------------------------------

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/blog', blogRoutes)
app.use('/api/hobbies', hobbyRoutes)
app.use('/api/certificates', certRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/admin', adminRoutes)

// ---- 404 + error handler (LAST) -----------------------------------------

app.use(notFoundHandler)
app.use(errorHandler)

export default app
