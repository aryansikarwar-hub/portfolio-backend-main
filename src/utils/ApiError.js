/**
 * Use throughout the codebase to signal a known, expected HTTP failure
 * (validation, auth, not-found, conflict). The errorHandler middleware
 * formats these into a consistent JSON response; everything else
 * becomes a 500.
 */
export class ApiError extends Error {
    constructor(statusCode, message, { code, details } = {}) {
        super(message)
        this.statusCode = statusCode
        this.code = code
        this.details = details
        this.isOperational = true
        Error.captureStackTrace?.(this, this.constructor)
    }

    static badRequest(message = 'Bad request', opts) {
        return new ApiError(400, message, opts)
    }
    static unauthorized(message = 'Unauthorized', opts) {
        return new ApiError(401, message, opts)
    }
    static forbidden(message = 'Forbidden', opts) {
        return new ApiError(403, message, opts)
    }
    static notFound(message = 'Not found', opts) {
        return new ApiError(404, message, opts)
    }
    static conflict(message = 'Conflict', opts) {
        return new ApiError(409, message, opts)
    }
    static tooMany(message = 'Too many requests', opts) {
        return new ApiError(429, message, opts)
    }
    static internal(message = 'Internal server error', opts) {
        return new ApiError(500, message, opts)
    }
}