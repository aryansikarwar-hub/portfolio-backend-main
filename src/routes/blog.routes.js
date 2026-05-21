import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { writeLimiter } from '../middleware/rateLimit.js'
import {
    paginationSchema,
    slugParam,
    idParam,
    blogCreateSchema,
    blogUpdateSchema,
} from '../validators/schemas.js'
import {
    listPublic,
    getPublicBySlug,
    like,
    listAdmin,
    getAdminById,
    create,
    update,
    remove,
} from '../controllers/blog.controller.js'

const router = Router()

router.get('/', validate({ query: paginationSchema }), listPublic)
router.get('/:slug', validate({ params: slugParam }), getPublicBySlug)
router.post('/:slug/like', writeLimiter, validate({ params: slugParam }), like)

router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), validate({ query: paginationSchema }), listAdmin)
router.get('/admin/:id', requireAuth, requireRole('admin', 'editor'), validate({ params: idParam }), getAdminById)
router.post('/', requireAuth, requireRole('admin', 'editor'), validate({ body: blogCreateSchema }), create)
router.patch('/:id', requireAuth, requireRole('admin', 'editor'), validate({ params: idParam, body: blogUpdateSchema }), update)
router.delete('/:id', requireAuth, requireRole('admin'), validate({ params: idParam }), remove)

export default router
