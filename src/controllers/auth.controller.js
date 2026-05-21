import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    setAuthCookies,
    clearAuthCookies,
} from '../services/token.service.js'

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Always look up with `+password` since the field has select:false.
    const user = await User.findOne({ email }).select('+password')

    // Constant-ish behaviour on failure to discourage email enumeration —
    // we still do a bcrypt comparison even when the user isn't found, so
    // response time stays similar.
    if (!user) {
        await User.prototype.comparePassword.call({ password: '$2a$12$invalidinvalidinvalidinvaliduO' }, password)
            .catch(() => {})
        throw ApiError.unauthorized('Invalid credentials')
    }

    const ok = await user.comparePassword(password)
    if (!ok) throw ApiError.unauthorized('Invalid credentials')

    user.lastLoginAt = new Date()
    await user.save()

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    setAuthCookies(res, accessToken, refreshToken)

    res.json({
        success: true,
        data: { user: user.toSafeJSON() },
    })
})

export const refresh = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken
    if (!token) throw ApiError.unauthorized('No refresh token')

    let payload
    try {
        payload = verifyRefreshToken(token)
    } catch {
        clearAuthCookies(res)
        throw ApiError.unauthorized('Invalid refresh token')
    }

    const user = await User.findById(payload.sub)
    if (!user || user.tokenVersion !== payload.tv) {
        clearAuthCookies(res)
        throw ApiError.unauthorized('Refresh token revoked')
    }

    // Rotate both tokens on every refresh. Cheap insurance against replay.
    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)
    setAuthCookies(res, accessToken, refreshToken)

    res.json({ success: true, data: { user: user.toSafeJSON() } })
})

export const logout = asyncHandler(async (_req, res) => {
    clearAuthCookies(res)
    res.json({ success: true })
})

/** Logout everywhere — bump tokenVersion, invalidates every outstanding token. */
export const logoutAll = asyncHandler(async (req, res) => {
    req.user.tokenVersion += 1
    await req.user.save()
    clearAuthCookies(res)
    res.json({ success: true })
})

export const me = asyncHandler(async (req, res) => {
    res.json({ success: true, data: { user: req.user.toSafeJSON() } })
})

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')
    if (!user) throw ApiError.unauthorized()

    const ok = await user.comparePassword(currentPassword)
    if (!ok) throw ApiError.unauthorized('Current password is incorrect')

    user.password = newPassword
    user.tokenVersion += 1 // log out everywhere
    await user.save()

    clearAuthCookies(res)
    res.json({ success: true, message: 'Password updated. Please log in again.' })
})
