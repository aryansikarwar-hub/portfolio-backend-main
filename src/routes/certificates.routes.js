import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
    paginationSchema,
    idParam,
    certificateCreateSchema,
    certificateUpdateSchema,
} from '../validators/schemas.js'
import {
    listPublic,
    listAdmin,
    create,
    update,
    remove,
} from '../controllers/certificates.controller.js'

const router = Router()

router.get('/', validate({ query: paginationSchema }), listPublic)

router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), listAdmin)
router.post('/', requireAuth, requireRole('admin', 'editor'), validate({ body: certificateCreateSchema }), create)
router.patch('/:id', requireAuth, requireRole('admin', 'editor'), validate({ params: idParam, body: certificateUpdateSchema }), update)
router.delete('/:id', requireAuth, requireRole('admin'), validate({ params: idParam }), remove)

export default router
