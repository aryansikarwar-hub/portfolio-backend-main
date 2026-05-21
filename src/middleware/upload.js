import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

const fileFilter = (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new ApiError(415, `Unsupported file type: ${file.mimetype}`))
    }
    cb(null, true)
}

/**
 * Memory storage — we hold the file buffer in RAM, then stream it straight to
 * Cloudinary in the controller. This avoids the stale `multer-storage-cloudinary`
 * package (which pins to Cloudinary v1) and works cleanly with the v2 SDK.
 * Files are small (5 MB cap, max 8) so buffering in memory is fine.
 */
export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 8 },
})