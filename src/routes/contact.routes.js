import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { writeLimiter } from '../middleware/rateLimit.js'
import { contactSchema, paginationSchema, idParam } from '../validators/schemas.js'
import { submit, listAdmin, setStatus, remove } from '../controllers/contact.controller.js'

const router = Router()

router.post('/', writeLimiter, validate({ body: contactSchema }), submit)

router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), validate({ query: paginationSchema }), listAdmin)
router.patch(
    '/admin/:id',
    requireAuth,
    requireRole('admin', 'editor'),
    validate({
        params: idParam,
        body: z.object({
            status: z.enum(['new', 'read', 'replied', 'archived', 'spam']),
            adminNotes: z.string().max(2000).optional(),
        }),
    }),
    setStatus
)
router.delete('/admin/:id', requireAuth, requireRole('admin'), validate({ params: idParam }), remove)

export default router
