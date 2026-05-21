import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { trackSchema } from '../validators/schemas.js'
import { track, stats } from '../controllers/analytics.controller.js'

const router = Router()

router.post('/track', validate({ body: trackSchema }), track)
router.get('/stats', requireAuth, requireRole('admin', 'editor'), stats)

export default router
