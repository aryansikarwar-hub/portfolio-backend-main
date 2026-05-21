import { connectDB, disconnectDB } from '../config/db.js'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { logger } from '../utils/logger.js'

/**
 * Idempotent bootstrap. Re-running won't reset the password if the user
 * already exists — change passwords through the API, not by re-seeding.
 */
async function run() {
    if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
        console.error('\nSEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env\n')
        process.exit(1)
    }

    await connectDB()

    const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL })
    if (existing) {
        logger.info(`Admin already exists: ${existing.email}`)
    } else {
        const user = await User.create({
            email: env.SEED_ADMIN_EMAIL,
            password: env.SEED_ADMIN_PASSWORD,
            name: env.SEED_ADMIN_NAME || 'Admin',
            role: 'admin',
        })
        logger.info(`Created admin: ${user.email}`)
    }

    await disconnectDB()
    process.exit(0)
}

run().catch(err => {
    logger.error('seedAdmin failed', { message: err.message })
    process.exit(1)
})
