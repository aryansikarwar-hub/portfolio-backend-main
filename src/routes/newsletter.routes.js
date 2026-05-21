import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { writeLimiter } from '../middleware/rateLimit.js'
import { subscribeSchema, paginationSchema, idParam } from '../validators/schemas.js'
import {
    subscribe,
    confirm,
    unsubscribe,
    listAdmin,
    remove,
} from '../controllers/newsletter.controller.js'

const router = Router()

router.post('/subscribe', writeLimiter, validate({ body: subscribeSchema }), subscribe)
router.get('/confirm', confirm)
router.get('/unsubscribe', unsubscribe)

router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), validate({ query: paginationSchema }), listAdmin)
router.delete('/admin/:id', requireAuth, requireRole('admin'), validate({ params: idParam }), remove)

export default router
