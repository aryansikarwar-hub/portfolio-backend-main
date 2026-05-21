import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { connectDB, disconnectDB } from '../config/db.js'
import { Project } from '../models/Project.js'
import { BlogPost } from '../models/BlogPost.js'
import { Hobby } from '../models/Hobby.js'
import { Certificate } from '../models/Certificate.js'
import { makeSlug, makeUniqueSlug } from '../utils/slugify.js'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')

/**
 * Idempotent seed. We upsert by slug for projects/blog/hobbies so re-running
 * doesn't create duplicates. Certificates upsert by title+issuer since they
 * don't have slugs.
 *
 *   --reset   Wipe each collection first before inserting (use carefully).
 */
const RESET = process.argv.includes('--reset')

async function loadJson(name) {
    const file = path.join(DATA_DIR, name)
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw)
}

async function seedProjects() {
    const data = await loadJson('projects.json')
    if (RESET) await Project.deleteMany({})

    let created = 0
    let updated = 0
    for (const item of data) {
        const slug = makeSlug(item.slug || item.name)
        const existing = await Project.findOne({ slug })
        if (existing) {
            Object.assign(existing, item, { slug })
            await existing.save()
            updated++
        } else {
            await Project.create({ ...item, slug })
            created++
        }
    }
    logger.info(`Projects — created: ${created}, updated: ${updated}`)
}

async function seedBlogPosts() {
    const data = await loadJson('blogPosts.json')
    if (RESET) await BlogPost.deleteMany({})

    let created = 0
    let updated = 0
    for (const item of data) {
        const slug = makeSlug(item.slug || item.title)
        const existing = await BlogPost.findOne({ slug })
        if (existing) {
            Object.assign(existing, item, { slug })
            await existing.save()
            updated++
        } else {
            await BlogPost.create({ ...item, slug })
            created++
        }
    }
    logger.info(`Blog posts — created: ${created}, updated: ${updated}`)
}

async function seedHobbies() {
    const data = await loadJson('hobbies.json')
    if (RESET) await Hobby.deleteMany({})

    let created = 0
    let updated = 0
    for (const item of data) {
        const slug = makeSlug(item.slug || item.name)
        const existing = await Hobby.findOne({ slug })
        if (existing) {
            Object.assign(existing, item, { slug })
            await existing.save()
            updated++
        } else {
            await Hobby.create({ ...item, slug })
            created++
        }
    }
    logger.info(`Hobbies — created: ${created}, updated: ${updated}`)
}

async function seedCertificates() {
    const data = await loadJson('certificates.json')
    if (RESET) await Certificate.deleteMany({})

    let created = 0
    let updated = 0
    for (const item of data) {
        // Composite key — title + issuer should be unique enough for portfolio scale.
        const existing = await Certificate.findOne({ title: item.title, issuer: item.issuer })
        if (existing) {
            Object.assign(existing, item)
            await existing.save()
            updated++
        } else {
            await Certificate.create(item)
            created++
        }
    }
    logger.info(`Certificates — created: ${created}, updated: ${updated}`)
}

async function run() {
    await connectDB()
    try {
        if (RESET) logger.warn('--reset passed: wiping content collections before seeding')

        await seedProjects()
        await seedBlogPosts()
        await seedHobbies()
        await seedCertificates()

        logger.info('Content seed complete')
    } finally {
        await disconnectDB()
    }
    process.exit(0)
}

run().catch(err => {
    logger.error('seedContent failed', { message: err.message, stack: err.stack })
    process.exit(1)
})
