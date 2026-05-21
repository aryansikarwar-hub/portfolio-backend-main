import rateLimit from 'express-rate-limit'

const makeLimiter = (opts) =>
    rateLimit({
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        ...opts,
    })

/** Default for the whole /api surface — generous, just for runaway clients. */
export const globalLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 600,
    message: { error: 'Too many requests, please slow down.' },
})

/** Auth endpoints — strict, to slow down credential stuffing. */
export const authLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts, please try again later.' },
})

/** Contact / newsletter / comments — moderate, abuse-prone surfaces. */
export const writeLimiter = makeLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { error: 'Too many submissions from this IP, please try again later.' },
})
