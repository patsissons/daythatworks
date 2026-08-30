/// <reference path="../pb_data/types.d.ts" />

// Captures identity-provider avatar URLs onto users.avatarUrl and keeps the
// denormalized submissions.submitterAvatarUrl in sync. Avatar sourcing is
// best-effort: failures are logged and must never break authentication.

// Fresh OAuth logins carry the provider avatar in e.oAuth2User; re-stamp it
// every login so rotated URLs (e.g. Google lh3) heal themselves.
onRecordAuthWithOAuth2Request((e) => {
  e.next() // creates e.record for first-time OAuth users
  const lib = require(`${__hooks}/lib/avatars.js`)
  try {
    const url = e.oAuth2User ? e.oAuth2User.avatarURL : ''
    if (e.record && lib.syncUserAvatar(e.app, e.record, url)) {
      lib.backfillSubmissions(e.app, e.record)
    }
  } catch (err) {
    console.error('[avatars] oauth avatar sync failed', err)
  }
}, 'users')

// authRefresh fires on every SPA mount, covering users whose long-lived
// session predates avatar capture: recover a GitHub avatar deterministically
// when nothing else is stored, and refresh their submissions either way
// (the filtered backfill query makes this a cheap no-op normally).
onRecordAuthRefreshRequest((e) => {
  e.next()
  const lib = require(`${__hooks}/lib/avatars.js`)
  try {
    if (!e.record) return
    if (!e.record.getString('avatarUrl') && !e.record.getString('avatar')) {
      const url = lib.githubFallbackUrl(e.app, e.record)
      if (url) {
        e.record.set('avatarUrl', url)
        e.app.save(e.record)
      }
    }
    lib.backfillSubmissions(e.app, e.record)
  } catch (err) {
    console.error('[avatars] refresh avatar backfill failed', err)
  }
}, 'users')
