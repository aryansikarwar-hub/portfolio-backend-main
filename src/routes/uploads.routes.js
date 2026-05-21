import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { validate } from '../middleware/validate.js'
import { uploadSingle, uploadMultiple, removeUpload } from '../controllers/uploads.controller.js'

const router = Router()

// All upload endpoints are admin-only — no anonymous uploads anywhere.
router.use(requireAuth, requireRole('admin', 'editor'))

router.post('/', upload.single('file'), uploadSingle)
router.post('/many', upload.array('files', 8), uploadMultiple)
router.delete(
    '/',
    validate({ body: z.object({ publicId: z.string().min(1).max(300) }) }),
    removeUpload
)

export default router
