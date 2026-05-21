import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'
import { isProd } from '../config/env.js'

/**
 * Convert Mongoose / JWT / Multer errors into ApiError so the response
 * shape stays consistent regardless of where the failure came from.
 */
function normalizeError(err) {
    if (err instanceof ApiError) return err

    // Mongoose validation
    if (err instanceof mongoose.Error.ValidationError) {
        const details = Object.values(err.errors).map(e => ({
            path: e.path,
            message: e.message,
            kind: e.kind,
        }))
        return ApiError.badRequest('Validation failed', { code: 'MONGOOSE_VALIDATION', details })
    }

    // Mongoose cast (bad ObjectId, etc.)
    if (err instanceof mongoose.Error.CastError) {
        return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`, { code: 'CAST_ERROR' })
    }

    // Duplicate key
    if (err?.code === 11000) {
        const fields = Object.keys(err.keyPattern || err.keyValue || {})
        return ApiError.conflict(`Duplicate value for: ${fields.join(', ')}`, {
            code: 'DUPLICATE_KEY',
            details: err.keyValue,
        })
    }

    // Multer
    if (err?.name === 'MulterError') {
        const message =
            err.code === 'LIMIT_FILE_SIZE' ? 'File too large' :
            err.code === 'LIMIT_FILE_COUNT' ? 'Too many files' :
            err.code === 'LIMIT_UNEXPECTED_FILE' ? `Unexpected field: ${err.field}` :
            err.message
        return ApiError.badRequest(message, { code: err.code })
    }

    // JWT
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
        return ApiError.unauthorized('Invalid or expired token')
    }

    return null
}

export function notFoundHandler(req, _res, next) {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
    const normalized = normalizeError(err) || err
    const statusCode = normalized.statusCode || 500
    const isKnown = normalized instanceof ApiError

    // 5xx and unknown errors get logged with stack; 4xx are noise so we log at info.
    if (statusCode >= 500 || !isKnown) {
        logger.error('Unhandled error', {
            method: req.method,
            path: req.originalUrl,
            message: err.message,
            stack: err.stack,
        })
    } else {
        logger.info(`${statusCode} ${req.method} ${req.originalUrl} — ${normalized.message}`)
    }

    const payload = {
        success: false,
        error: {
            message: isKnown || !isProd ? normalized.message : 'Internal server error',
            code: normalized.code,
            details: normalized.details,
        },
    }
    // Strip undefined keys so the response stays clean.
    if (!payload.error.code) delete payload.error.code
    if (!payload.error.details) delete payload.error.details

    res.status(statusCode).json(payload)
}
