import slugifyLib from 'slugify'

export function makeSlug(input) {
    return slugifyLib(String(input ?? ''), {
        lower: true,
        strict: true,
        trim: true,
    })
}

/**
 * Given a Mongoose model and a base slug, returns a slug that is unique
 * across the collection by appending `-2`, `-3`, … if needed.
 *
 * Pass `ignoreId` to allow the current document to "own" its slug during
 * updates (so re-saving the same title is a no-op).
 */
export async function makeUniqueSlug(Model, base, ignoreId = null) {
    const slug = makeSlug(base)
    if (!slug) return slug

    let candidate = slug
    let n = 2
    // Hard cap to prevent runaways on pathological inputs.
    while (n < 1000) {
        const query = { slug: candidate }
        if (ignoreId) query._id = { $ne: ignoreId }
        const exists = await Model.exists(query)
        if (!exists) return candidate
        candidate = `${slug}-${n++}`
    }
    return `${slug}-${Date.now()}`
}
