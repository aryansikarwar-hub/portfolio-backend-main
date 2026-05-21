import { ApiError } from '../utils/ApiError.js'

/**
 * Generic zod validator. Pass an object with optional `body`, `query`,
 * `params` schemas; whatever validates gets written back onto `req` so
 * controllers can rely on coerced/parsed values.
 *
 *     router.post('/x', validate({ body: createSchema }), handler)
 */
export const validate = (schemas) => (req, _res, next) => {
    try {
        if (schemas.body) req.body = schemas.body.parse(req.body)
        if (schemas.query) req.query = schemas.query.parse(req.query)
        if (schemas.params) req.params = schemas.params.parse(req.params)
        next()
    } catch (err) {
        if (err?.name === 'ZodError') {
            const details = err.issues.map(i => ({
                path: i.path.join('.'),
                message: i.message,
                code: i.code,
            }))
            return next(ApiError.badRequest('Validation failed', { code: 'VALIDATION_ERROR', details }))
        }
        next(err)
    }
}
