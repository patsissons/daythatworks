// Local-dev seeding (used by pb_hooks/dev-seed.pb.js): ensure demo events
// exist at /events/test (specific dates) and /events/test-weekly (days of the
// week) so a local frontend always has something to open.
// Runs only when DEV_AUTH=true — never on PocketHost.

var SLUG = 'test'
var WEEKLY_SLUG = 'test-weekly'

/** Candidate days for the weekly seed (Sunday-first, like records.js). */
var WEEKLY_DAYS = ['mon', 'wed', 'thu', 'sat']

/** 26-char lowercase id matching the app's ULID shape (src/lib/id.ts). */
function newId() {
  var alphabet = '0123456789abcdefghjkmnpqrstvwxyz'
  var out = ''
  for (var i = 0; i < 26; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/** ISO YYYY-MM-DD for `days` days after `now` (local time, noon-pinned). */
function isoInDays(now, days) {
  var date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
    12,
  )
  var pad = function (value) {
    return String(value).length < 2 ? '0' + value : String(value)
  }
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
  )
}

/** A spread of upcoming candidate days (relative to `now`). */
function seedDates(now) {
  return [2, 3, 5, 9, 10, 12, 16].map(function (days) {
    return isoInDays(now, days)
  })
}

/** Find or create the DEV_AUTH user (same identity /api/dev-login uses). */
function ensureDevUser(app, env) {
  var email = env('DEV_AUTH_EMAIL') || 'dev@example.com'
  try {
    return app.findAuthRecordByEmail('users', email)
  } catch (err) {
    var users = app.findCollectionByNameOrId('users')
    var user = new Record(users)
    user.set('email', email)
    user.set('name', env('DEV_AUTH_NAME') || 'Dev User')
    user.setVerified(true)
    user.setRandomPassword()
    app.save(user)
    return user
  }
}

/** Create an event at `slug` unless one already exists. Returns true when a
 * new event was created. */
function seedEvent(app, env, slug, fields) {
  try {
    app.findFirstRecordByFilter('events', 'slug = {:slug}', { slug: slug })
    return false // already seeded
  } catch (err) {
    // not found — create below
  }

  var user = ensureDevUser(app, env)
  var events = app.findCollectionByNameOrId('events')
  var record = new Record(events)
  record.set('id', newId())
  record.set('title', fields.title)
  record.set('slug', slug)
  record.set(
    'description',
    'Local seed data — this event is recreated on startup whenever /events/' +
      slug +
      ' does not exist.',
  )
  record.set('kind', fields.kind)
  record.set('dates', fields.dates)
  record.set('creator', user.id)
  record.set('creatorName', user.getString('name'))
  record.set('creatorEmail', user.getString('email'))
  app.save(record)
  return true
}

/** Ensure every seed event exists. Returns the slugs newly created. */
function seedTestEvents(app, env) {
  var created = []
  if (
    seedEvent(app, env, SLUG, {
      title: 'Test Event',
      kind: 'dates',
      dates: seedDates(new Date()),
    })
  ) {
    created.push(SLUG)
  }
  if (
    seedEvent(app, env, WEEKLY_SLUG, {
      title: 'Test Weekly Event',
      kind: 'weekdays',
      dates: WEEKLY_DAYS,
    })
  ) {
    created.push(WEEKLY_SLUG)
  }
  return created
}

module.exports = {
  SLUG,
  WEEKLY_SLUG,
  WEEKLY_DAYS,
  newId,
  isoInDays,
  seedDates,
  seedTestEvents,
}
