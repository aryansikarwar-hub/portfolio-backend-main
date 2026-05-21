import { z } from 'zod'
import mongoose from 'mongoose'

// ---- Primitive helpers --------------------------------------------------

const objectId = z
    .string()
    .refine(v => mongoose.isValidObjectId(v), { message: 'Invalid ObjectId' })

const slug = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen-separated')
    .min(1)
    .max(120)

const email = z.string().email().toLowerCase().trim()
const trimmed = (max) => z.string().trim().max(max)

// "Smart" string that lets us send "" from a form but reject longer junk.
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''))

// Pagination – coerced from query string ints.
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().max(60).optional(),
    q: z.string().trim().max(200).optional(),
    category: z.string().trim().max(60).optional(),
    tag: z.string().trim().max(60).optional(),
    featured: z
        .union([z.literal('true'), z.literal('false')])
        .transform(v => v === 'true')
        .optional(),
})

export const slugParam = z.object({ slug })
export const idParam = z.object({ id: objectId })

// ---- Auth ---------------------------------------------------------------

export const loginSchema = z.object({
    email,
    password: z.string().min(8).max(200),
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(8).max(200),
    newPassword: z.string().min(8).max(200),
})

// ---- Contact ------------------------------------------------------------

export const contactSchema = z.object({
    name: trimmed(100).min(1),
    email,
    subject: optionalText(200),
    message: trimmed(5000).min(10, 'Message must be at least 10 characters'),
    // Honeypot — bots fill any field they see; humans never touch it.
    website: z.string().max(0).optional().or(z.literal('')),
})

// ---- Newsletter ---------------------------------------------------------

export const subscribeSchema = z.object({
    email,
    name: optionalText(100),
    source: optionalText(60),
})

// ---- Comments -----------------------------------------------------------

export const commentSchema = z.object({
    author: trimmed(80).min(1),
    email,
    website: optionalText(300),
    body: trimmed(3000).min(2),
    parent: objectId.optional(),
    // Honeypot
    company: z.string().max(0).optional().or(z.literal('')),
})

export const moderateCommentSchema = z.object({
    status: z.enum(['approved', 'pending', 'spam', 'deleted']),
})

// ---- Content: Project ---------------------------------------------------

export const projectCreateSchema = z.object({
    name: trimmed(200).min(1),
    slug: slug.optional(),
    subtitle: optionalText(300),
    description: optionalText(5000),
    thumbnail: optionalText(500),
    accent: optionalText(20),
    year: optionalText(20),
    role: optionalText(100),
    place: optionalText(100),
    tech: z.array(trimmed(60)).max(40).default([]),
    tags: z.array(trimmed(60)).max(40).default([]),
    category: optionalText(60),
    githubUrl: optionalText(500),
    liveUrl: optionalText(500),
    featured: z.boolean().optional(),
    published: z.boolean().optional(),
    order: z.number().int().optional(),
    overview: z.any().optional(),
    challenge: z.any().optional(),
    solution: z.any().optional(),
    keyFeatures: z.array(z.any()).optional(),
    process: z.array(z.any()).optional(),
    gallery: z.array(z.any()).optional(),
    results: z.any().optional(),
    meta: z.any().optional(),
})

export const projectUpdateSchema = projectCreateSchema.partial()

// ---- Content: BlogPost --------------------------------------------------

export const blogCreateSchema = z.object({
    title: trimmed(300).min(1),
    slug: slug.optional(),
    excerpt: optionalText(500),
    date: optionalText(60),
    publishedAt: z.coerce.date().optional(),
    readTime: optionalText(30),
    tags: z.array(trimmed(60)).max(40).default([]),
    category: optionalText(60),
    color: optionalText(20),
    cover: optionalText(500),
    featured: z.boolean().optional(),
    published: z.boolean().optional(),
    content: z.array(z.any()).default([]),
})

export const blogUpdateSchema = blogCreateSchema.partial()

// ---- Content: Hobby -----------------------------------------------------

export const hobbyCreateSchema = z.object({
    name: trimmed(120).min(1),
    slug: slug.optional(),
    title: optionalText(120),
    title2: optionalText(120),
    icon: optionalText(60),
    accent: optionalText(20),
    color: optionalText(20),
    place: optionalText(100),
    role: optionalText(100),
    language: optionalText(100),
    year: optionalText(30),
    gradient: optionalText(2000),
    shortDesc: optionalText(500),
    description: optionalText(5000),
    tags: z.array(trimmed(60)).max(40).default([]),
    highlights: z.array(trimmed(300)).max(40).default([]),
    stats: z.array(z.any()).optional(),
    gallery: z.array(z.any()).optional(),
    meta: z.any().optional(),
    published: z.boolean().optional(),
    order: z.number().int().optional(),
})

export const hobbyUpdateSchema = hobbyCreateSchema.partial()

// ---- Content: Certificate -----------------------------------------------

export const certificateCreateSchema = z.object({
    title: trimmed(200).min(1),
    issuer: trimmed(200).min(1),
    issueDate: optionalText(60),
    credentialId: optionalText(120),
    credentialUrl: optionalText(500),
    thumbnail: optionalText(500),
    category: optionalText(60),
    skills: z.array(trimmed(60)).max(40).default([]),
    published: z.boolean().optional(),
    order: z.number().int().optional(),
})

export const certificateUpdateSchema = certificateCreateSchema.partial()

// ---- Analytics ----------------------------------------------------------

export const trackSchema = z.object({
    path: trimmed(300).min(1),
    referrer: optionalText(500),
})
