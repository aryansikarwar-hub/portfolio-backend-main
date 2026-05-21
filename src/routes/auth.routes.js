import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { loginSchema, changePasswordSchema } from '../validators/schemas.js'
import {
    login,
    refresh,
    logout,
    logoutAll,
    me,
    changePassword,
} from '../controllers/auth.controller.js'

const router = Router()

router.post('/login', authLimiter, validate({ body: loginSchema }), login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.post('/logout-all', requireAuth, logoutAll)
router.get('/me', requireAuth, me)
router.post('/change-password', requireAuth, authLimiter, validate({ body: changePasswordSchema }), changePassword)

export default router
