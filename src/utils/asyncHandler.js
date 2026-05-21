/**
 * Eliminates try/catch boilerplate from every controller. Any thrown error
 * (or rejected promise) flows into the central errorHandler middleware.
 *
 *     router.get('/x', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)
