import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { dashboard } from '../controllers/admin.controller.js'

const router = Router()

router.use(requireAuth, requireRole('admin', 'editor'))
router.get('/dashboard', dashboard)

export default router
