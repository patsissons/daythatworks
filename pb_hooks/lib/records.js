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

// Weekday-event option tokens, in canonical (Sunday-first) order. Mirrored in
// src/lib/weekdays.ts — src/lib/weekdays.test.ts keeps them in sync.
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** Validate weekday tokens, dedupe, and return them in Sunday-first order. */
function normalizeWeekdays(values) {
  const seen = {}
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (typeof value !== 'string' || WEEKDAYS.indexOf(value) === -1) {
      throw new BadRequestError('days of the week must be one of ' + WEEKDAYS.join(', '))
    }
    seen[value] = true
  }
  return WEEKDAYS.filter((day) => seen[day])
}

/** True for events polling days of the week (empty kind means dates). */
function isWeekdayKind(kind) {
  return kind === 'weekdays'
}

/** Normalize an event's or submission's options per the event's kind. */
function normalizeOptions(kind, values) {
  return isWeekdayKind(kind) ? normalizeWeekdays(values) : normalizeDates(values)
}

/** True when the request is authenticated as a regular app user. */
function isUserAuth(auth) {
  return !!auth && auth.collection().name === 'users'
}

/** True when the request is authenticated as a guest user. */
function isGuestAuth(auth) {
  return isUserAuth(auth) && auth.getBool('guest')
}

/** A guest's self-asserted name for one record: trimmed, at most 100 chars. */
function guestName(value) {
  const name = String(value || '').trim()
  if (name.length > 100) {
    throw new BadRequestError('Names can be at most 100 characters.')
  }
  return name
}

/**
 * The organizer name to stamp on a new event. Guests name each event
 * themselves (the new-event form's name; their account name is only the
 * form default); full accounts always show their account name.
 */
function creatorNameFor(auth, record) {
  if (!isGuestAuth(auth)) return auth.getString('name')
  return guestName(record.getString('creatorName'))
}

/**
 * The responder name to stamp on a submission. Guests name each response
 * themselves, except on hideNames events where guest responses are always
 * anonymous; full accounts always show their account name.
 */
function submitterNameFor(auth, event, record) {
  if (!isGuestAuth(auth)) return auth.getString('name')
  if (event.getBool('hideNames')) return ''
  return guestName(record.getString('submitterName'))
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
  WEEKDAYS,
  normalizeWeekdays,
  isWeekdayKind,
  normalizeOptions,
  isUserAuth,
  isGuestAuth,
  guestName,
  creatorNameFor,
  submitterNameFor,
  RESERVED_SLUGS,
  isReservedSlug,
}
