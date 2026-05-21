import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { writeLimiter } from '../middleware/rateLimit.js'
import {
    commentSchema,
    moderateCommentSchema,
    paginationSchema,
    slugParam,
    idParam,
} from '../validators/schemas.js'
import {
    listForPost,
    create,
    listAdmin,
    moderate,
    remove,
} from '../controllers/comments.controller.js'

const router = Router()

// Public — scoped by blog slug.
router.get('/posts/:slug', validate({ params: slugParam }), listForPost)
router.post(
    '/posts/:slug',
    writeLimiter,
    validate({ params: slugParam, body: commentSchema }),
    create
)

// Admin moderation.
router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), validate({ query: paginationSchema }), listAdmin)
router.patch('/admin/:id', requireAuth, requireRole('admin', 'editor'), validate({ params: idParam, body: moderateCommentSchema }), moderate)
router.delete('/admin/:id', requireAuth, requireRole('admin'), validate({ params: idParam }), remove)

export default router
