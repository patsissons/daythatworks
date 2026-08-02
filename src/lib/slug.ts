// Event slugs: lowercase alphanumerics separated by single hyphens.
// Must match the `slug` field pattern in pb_migrations/1700000002_create_events.js.

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Slugs with route-level meaning under /events/ ('new' collides with the
// create page; 'edit' and 's' are path segments of event subroutes).
// Mirrored in pb_hooks/lib/records.js — src/lib/slug.test.ts keeps them in
// sync; edit both together.
export const RESERVED_SLUGS = ['new', 'edit', 's']

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.includes(value)
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value)
}

/** Derive a slug suggestion from a title, e.g. "Summer BBQ!" → "summer-bbq". */
export function suggestSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/, '')
}
