// Shared helpers for record hooks. Loaded with require() from inside handler
// callbacks (JSVM handlers cannot close over top-level file scope).

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parse a record's json `dates` field into an array (missing → []). */
function readDates(record) {
  const raw = record.getString('dates')
  if (!raw) return []
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new BadRequestError('dates must be a JSON array of YYYY-MM-DD strings')
  }
  if (!Array.isArray(parsed)) {
    throw new BadRequestError('dates must be a JSON array of YYYY-MM-DD strings')
  }
  return parsed
}

/** Validate ISO date strings, dedupe, and return them sorted. */
function normalizeDates(dates) {
  const seen = {}
  const out = []
  for (let i = 0; i < dates.length; i++) {
    const value = dates[i]
    if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
      throw new BadRequestError('dates must be YYYY-MM-DD strings')
    }
    const year = parseInt(value.slice(0, 4), 10)
    const month = parseInt(value.slice(5, 7), 10)
    const day = parseInt(value.slice(8, 10), 10)
    const check = new Date(year, month - 1, day)
    if (
      check.getFullYear() !== year ||
      check.getMonth() !== month - 1 ||
      check.getDate() !== day
    ) {
      throw new BadRequestError("'" + value + "' is not a valid calendar date")
    }
    if (!seen[value]) {
      seen[value] = true
      out.push(value)
    }
  }
  return out.sort()
}

/** True when the request is authenticated as a regular app user. */
function isUserAuth(auth) {
  return !!auth && auth.collection().name === 'users'
}

// Slugs with route-level meaning under /events/. Mirrored in
// src/lib/slug.ts — src/lib/slug.test.ts keeps them in sync.
const RESERVED_SLUGS = ['new', 'edit', 's']

function isReservedSlug(value) {
  return RESERVED_SLUGS.indexOf(value) !== -1
}

module.exports = {
  readDates,
  normalizeDates,
  isUserAuth,
  RESERVED_SLUGS,
  isReservedSlug,
}
