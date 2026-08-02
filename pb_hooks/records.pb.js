/// <reference path="../pb_data/types.d.ts" />

// Server-side guarantees for events and submissions:
// - dates payloads are validated/normalized (API rules can't inspect json)
// - creator*/submitter* identity fields are stamped from the authenticated
//   user so clients can't spoof them
// - private fields (emails, and names on hideNames events) are stripped from
//   responses via onRecordEnrich

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/records.js`)
  const rl = require(`${__hooks}/lib/rate-limit.js`)
  const dates = lib.normalizeDates(lib.readDates(e.record))
  if (dates.length < 2) {
    throw new BadRequestError('Pick at least 2 candidate dates.')
  }
  if (lib.isReservedSlug(e.record.getString('slug'))) {
    throw new BadRequestError('That link is reserved — pick another.')
  }
  e.record.set('dates', dates)
  if (lib.isUserAuth(e.auth)) {
    e.record.set('creator', e.auth.id)
    e.record.set('creatorName', e.auth.getString('name'))
    e.record.set('creatorEmail', e.auth.email())
  }

  // Guest creations are budgeted via a sliding 24h window over
  // guest_event_log; full accounts are unlimited. Quota is only consumed
  // (logged) after a successful create.
  let usage = null
  if (lib.isUserAuth(e.auth) && e.auth.getBool('guest')) {
    const cfg = rl.config((name) => $os.getenv(name))
    cfg.warnings.forEach((warning) => console.warn('[rate-limit] ' + warning))
    const ipHash = rl.hashIp(rl.normalizeIp(e.realIP()), cfg.salt, (s) => $security.sha256(s))
    const since = rl.cutoff(new Date(), cfg.windowMs)
    const verdict = rl.decide(
      {
        ipCount: e.app.countRecords(
          'guest_event_log',
          $dbx.exp('ipHash = {:h} AND created >= {:c}', { h: ipHash, c: since }),
        ),
        userCount: e.app.countRecords(
          'guest_event_log',
          $dbx.exp('creator = {:u} AND created >= {:c}', { u: e.auth.id, c: since }),
        ),
        globalCount: e.app.countRecords(
          'guest_event_log',
          $dbx.exp('created >= {:c}', { c: since }),
        ),
      },
      cfg,
    )
    if (!verdict.ok) {
      throw new TooManyRequestsError(rl.limitMessage(verdict.reason))
    }
    usage = { ipHash, creator: e.auth.id }
  }

  e.next()

  if (usage) {
    try {
      const record = new Record(e.app.findCollectionByNameOrId('guest_event_log'))
      record.set('ipHash', usage.ipHash)
      record.set('creator', usage.creator)
      e.app.save(record)
    } catch (err) {
      // fail open: the event exists but isn't counted against the budget
      console.error('[rate-limit] failed to log guest event creation', err)
    }
  }
}, 'events')

onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/records.js`)
  const dates = lib.normalizeDates(lib.readDates(e.record))
  if (dates.length < 2) {
    throw new BadRequestError('Pick at least 2 candidate dates.')
  }
  if (lib.isReservedSlug(e.record.getString('slug'))) {
    throw new BadRequestError('That link is reserved — pick another.')
  }
  e.record.set('dates', dates)
  if (lib.isUserAuth(e.auth)) {
    // ownership is immutable; refresh the denormalized identity fields
    e.record.set('creator', e.record.original().getString('creator'))
    e.record.set('creatorName', e.auth.getString('name'))
    e.record.set('creatorEmail', e.auth.email())
  }
  e.next()
}, 'events')

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/records.js`)
  const event = e.app.findRecordById('events', e.record.getString('event'))
  const offered = lib.readDates(event)
  const dates = lib.normalizeDates(lib.readDates(e.record))
  for (let i = 0; i < dates.length; i++) {
    if (offered.indexOf(dates[i]) === -1) {
      throw new BadRequestError("'" + dates[i] + "' is not offered by this event")
    }
  }
  e.record.set('dates', dates)
  if (lib.isUserAuth(e.auth)) {
    e.record.set('submitter', e.auth.id)
    e.record.set('submitterName', e.auth.getString('name'))
    e.record.set('submitterEmail', e.auth.email())
  }
  e.next()
}, 'submissions')

onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/records.js`)
  // the target event is immutable
  e.record.set('event', e.record.original().getString('event'))
  const event = e.app.findRecordById('events', e.record.getString('event'))
  const offered = lib.readDates(event)
  const dates = lib.normalizeDates(lib.readDates(e.record))
  for (let i = 0; i < dates.length; i++) {
    if (offered.indexOf(dates[i]) === -1) {
      throw new BadRequestError("'" + dates[i] + "' is not offered by this event")
    }
  }
  e.record.set('dates', dates)
  if (lib.isUserAuth(e.auth)) {
    e.record.set('submitter', e.record.original().getString('submitter'))
    e.record.set('submitterName', e.auth.getString('name'))
    e.record.set('submitterEmail', e.auth.email())
  }
  e.next()
}, 'submissions')

onRecordEnrich((e) => {
  const info = e.requestInfo
  if (info && info.hasSuperuserAuth()) {
    e.next()
    return
  }
  const auth = info ? info.auth : null
  const isCreator = !!auth && auth.id === e.record.getString('creator')
  if (!isCreator) {
    e.record.hide('creatorEmail')
  }
  e.next()
}, 'events')

onRecordEnrich((e) => {
  const info = e.requestInfo
  if (info && info.hasSuperuserAuth()) {
    e.next()
    return
  }
  const auth = info ? info.auth : null
  const isSubmitter = !!auth && auth.id === e.record.getString('submitter')
  let event = null
  try {
    event = e.app.findRecordById('events', e.record.getString('event'))
  } catch (err) {
    // event missing (mid-cascade); fall through to the most private view
  }
  const isCreator = !!auth && !!event && auth.id === event.getString('creator')
  if (!isSubmitter && !isCreator) {
    e.record.hide('submitterEmail')
    if (!event || event.getBool('hideNames')) {
      e.record.hide('submitterName')
    }
  }
  e.next()
}, 'submissions')
