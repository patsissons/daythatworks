/// <reference path="../pb_data/types.d.ts" />

// Local-only seed data: ensure demo events always exist at /events/test and
// /events/test-weekly (recreated on startup if deleted). Gated on DEV_AUTH=true — set it on a
// LOCAL `pocketbase serve` only, never in PocketHost secrets.
//
// On a brand-new pb_data the events collection doesn't exist yet during
// bootstrap (migrations apply just after), so the bootstrap attempt is backed
// up by a minutely cron with the same idempotent check.
onBootstrap((e) => {
  e.next()
  if ($os.getenv('DEV_AUTH') !== 'true') return
  try {
    const seed = require(`${__hooks}/lib/dev-seed.js`)
    seed.seedTestEvents(e.app, (name) => $os.getenv(name)).forEach((slug) => {
      console.log('[dev-seed] created /events/' + slug)
    })
  } catch (err) {
    console.warn('[dev-seed] deferred to cron (fresh database?): ' + err)
  }
})

if ($os.getenv('DEV_AUTH') === 'true') {
  // On-demand check, hit by the Vite dev server on startup (vite.config.ts)
  // so `pnpm dev` guarantees the seed without waiting for the cron.
  routerAdd('POST', '/api/dev-seed', (e) => {
    const seed = require(`${__hooks}/lib/dev-seed.js`)
    const created = seed.seedTestEvents(e.app, (name) => $os.getenv(name))
    created.forEach((slug) => {
      console.log('[dev-seed] created /events/' + slug)
    })
    return e.json(200, { created })
  })

  cronAdd('devSeedTestEvent', '* * * * *', () => {
    try {
      const seed = require(`${__hooks}/lib/dev-seed.js`)
      seed.seedTestEvents($app, (name) => $os.getenv(name)).forEach((slug) => {
        console.log('[dev-seed] created /events/' + slug)
      })
    } catch (err) {
      console.error('[dev-seed] failed to seed the test events', err)
    }
  })
}
