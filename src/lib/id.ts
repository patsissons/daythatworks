import { ulid } from 'ulid'

/**
 * New record id: a lowercased ULID (26 chars, Crockford base32) — sortable by
 * creation time and accepted by the widened id fields in pb_migrations.
 */
export function newId(): string {
  return ulid().toLowerCase()
}
