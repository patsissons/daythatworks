// Event slugs: lowercase alphanumerics separated by single hyphens.
// Must match the `slug` field pattern in pb_migrations/1700000002_create_events.js.

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

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
