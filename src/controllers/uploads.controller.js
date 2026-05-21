import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js'

/**
 * Stream a buffer to Cloudinary. Wraps the callback-based upload_stream in a
 * promise so controllers stay async/await. `quality:auto` + `fetch_format:auto`
 * give automatic compression and modern formats (webp/avif) on delivery.
 */
function streamToCloudinary(buffer, { folder = 'portfolio' } = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
            (err, result) => (err ? reject(err) : resolve(result))
        )
        stream.end(buffer)
    })
}

function shape(result) {
    return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
    }
}

export const uploadSingle = asyncHandler(async (req, res) => {
    if (!cloudinaryEnabled) {
        throw new ApiError(503, 'Image uploads are not configured on this server', {
            code: 'UPLOADS_DISABLED',
        })
    }
    if (!req.file) throw ApiError.badRequest('No file uploaded')

    const result = await streamToCloudinary(req.file.buffer)
    res.status(201).json({ success: true, data: shape(result) })
})

export const uploadMultiple = asyncHandler(async (req, res) => {
    if (!cloudinaryEnabled) {
        throw new ApiError(503, 'Image uploads are not configured on this server')
    }
    if (!req.files?.length) throw ApiError.badRequest('No files uploaded')

    const results = await Promise.all(req.files.map(f => streamToCloudinary(f.buffer)))
    res.status(201).json({ success: true, data: results.map(shape) })
})

export const removeUpload = asyncHandler(async (req, res) => {
    if (!cloudinaryEnabled) {
        throw new ApiError(503, 'Image uploads are not configured on this server')
    }
    const { publicId } = req.body
    if (!publicId) throw ApiError.badRequest('Missing publicId')

    const result = await cloudinary.uploader.destroy(publicId)
    if (result.result !== 'ok' && result.result !== 'not found') {
        throw new ApiError(502, `Cloudinary deletion failed: ${result.result}`)
    }
    res.json({ success: true })
})