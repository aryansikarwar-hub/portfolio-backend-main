import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
    paginationSchema,
    slugParam,
    idParam,
    hobbyCreateSchema,
    hobbyUpdateSchema,
} from '../validators/schemas.js'
import {
    listPublic,
    getPublicBySlug,
    listAdmin,
    create,
    update,
    remove,
} from '../controllers/hobbies.controller.js'

const router = Router()

router.get('/', validate({ query: paginationSchema }), listPublic)
router.get('/:slug', validate({ params: slugParam }), getPublicBySlug)

router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), listAdmin)
router.post('/', requireAuth, requireRole('admin', 'editor'), validate({ body: hobbyCreateSchema }), create)
router.patch('/:id', requireAuth, requireRole('admin', 'editor'), validate({ params: idParam, body: hobbyUpdateSchema }), update)
router.delete('/:id', requireAuth, requireRole('admin'), validate({ params: idParam }), remove)

export default router
