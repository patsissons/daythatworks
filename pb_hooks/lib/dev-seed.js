// Local-dev seeding (used by pb_hooks/dev-seed.pb.js): ensure a demo event
// exists at /events/test so a local frontend always has something to open.
// Runs only when DEV_AUTH=true — never on PocketHost.

var SLUG = 'test'

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

/** Create the /events/test event unless one already exists. Returns true when
 * a new event was created. */
function seedTestEvent(app, env) {
  try {
    app.findFirstRecordByFilter('events', 'slug = {:slug}', { slug: SLUG })
    return false // already seeded
  } catch (err) {
    // not found — create below
  }

  var user = ensureDevUser(app, env)
  var events = app.findCollectionByNameOrId('events')
  var record = new Record(events)
  record.set('id', newId())
  record.set('title', 'Test Event')
  record.set('slug', SLUG)
  record.set(
    'description',
    'Local seed data — this event is recreated on startup whenever /events/test does not exist.',
  )
  record.set('dates', seedDates(new Date()))
  record.set('creator', user.id)
  record.set('creatorName', user.getString('name'))
  record.set('creatorEmail', user.getString('email'))
  app.save(record)
  return true
}

module.exports = { SLUG, newId, isoInDays, seedDates, seedTestEvent }
