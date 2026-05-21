import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
    paginationSchema,
    slugParam,
    idParam,
    projectCreateSchema,
    projectUpdateSchema,
} from '../validators/schemas.js'
import {
    listPublic,
    getPublicBySlug,
    listAdmin,
    create,
    update,
    remove,
} from '../controllers/projects.controller.js'

const router = Router()

// Public
router.get('/', validate({ query: paginationSchema }), listPublic)
router.get('/:slug', validate({ params: slugParam }), getPublicBySlug)

// Admin
router.get(
    '/admin/all',
    requireAuth,
    requireRole('admin', 'editor'),
    validate({ query: paginationSchema }),
    listAdmin
)
router.post(
    '/',
    requireAuth,
    requireRole('admin', 'editor'),
    validate({ body: projectCreateSchema }),
    create
)
router.patch(
    '/:id',
    requireAuth,
    requireRole('admin', 'editor'),
    validate({ params: idParam, body: projectUpdateSchema }),
    update
)
router.delete(
    '/:id',
    requireAuth,
    requireRole('admin'),
    validate({ params: idParam }),
    remove
)

export default router
