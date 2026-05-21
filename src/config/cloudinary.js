import { v2 as cloudinary } from 'cloudinary'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

const configured =
    !!env.CLOUDINARY_CLOUD_NAME && !!env.CLOUDINARY_API_KEY && !!env.CLOUDINARY_API_SECRET

if (configured) {
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
    })
    logger.info('Cloudinary configured')
} else {
    logger.warn('Cloudinary not configured — /api/uploads will return 503')
}

export const cloudinaryEnabled = configured
export { cloudinary }
