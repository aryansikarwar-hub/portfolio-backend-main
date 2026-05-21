import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

function extractToken(req) {
    // Prefer the httpOnly cookie (more secure for browser clients).
    // Fall back to `Authorization: Bearer <token>` for API consumers / tests.
    if (req.cookies?.accessToken) return req.cookies.accessToken
    const header = req.get('authorization') || req.get('Authorization')
    if (header && header.startsWith('Bearer ')) return header.slice(7).trim()
    return null
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
    const token = extractToken(req)
    if (!token) throw ApiError.unauthorized('Not authenticated')

    let payload
    try {
        payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
    } catch {
        throw ApiError.unauthorized('Invalid or expired token')
    }

    const user = await User.findById(payload.sub).select('+password')
    if (!user) throw ApiError.unauthorized('Account no longer exists')
    if (user.tokenVersion !== payload.tv) throw ApiError.unauthorized('Token revoked')

    req.user = user
    next()
})

/**
 * Role guard. Use AFTER requireAuth.
 *
 *     router.delete('/x', requireAuth, requireRole('admin'), handler)
 */
export const requireRole = (...allowed) =>
    (req, _res, next) => {
        if (!req.user) return next(ApiError.unauthorized())
        if (!allowed.includes(req.user.role)) {
            return next(ApiError.forbidden('Insufficient role'))
        }
        next()
    }
