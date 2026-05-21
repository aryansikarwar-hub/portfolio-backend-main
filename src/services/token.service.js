import jwt from 'jsonwebtoken'
import { env, isProd } from '../config/env.js'

/**
 * All token lifecycle in one place. Access tokens are short-lived (15m
 * by default), refresh tokens are long-lived (7d) and rotated on every
 * refresh — see auth.controller.js.
 */

export function signAccessToken(user) {
    return jwt.sign(
        { sub: user._id.toString(), tv: user.tokenVersion, role: user.role },
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    )
}

export function signRefreshToken(user) {
    return jwt.sign(
        { sub: user._id.toString(), tv: user.tokenVersion },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    )
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET)
}

const baseCookie = {
    httpOnly: true,
    secure: isProd,
    // 'none' is required when frontend and backend live on different
    // origins (typical for Vercel + Render setups). Requires secure=true,
    // which we get from isProd. In dev, 'lax' works for localhost ports.
    sameSite: isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
}

const ACCESS_MAX_AGE = 15 * 60 * 1000
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie('accessToken', accessToken, { ...baseCookie, maxAge: ACCESS_MAX_AGE })
    res.cookie('refreshToken', refreshToken, {
        ...baseCookie,
        maxAge: REFRESH_MAX_AGE,
        // Pin refresh cookie to /api/auth so it never gets sent on unrelated requests.
        path: '/api/auth',
    })
}

export function clearAuthCookies(res) {
    res.clearCookie('accessToken', { ...baseCookie })
    res.clearCookie('refreshToken', { ...baseCookie, path: '/api/auth' })
}
