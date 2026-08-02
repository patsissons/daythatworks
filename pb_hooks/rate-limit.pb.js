/// <reference path="../pb_data/types.d.ts" />

// Hourly purge of guest_event_log rows past the retention window (2x the
// rate-limit window, so counts are never truncated mid-window).
cronAdd('purgeGuestEventLog', '0 * * * *', () => {
  const rl = require(`${__hooks}/lib/rate-limit.js`)
  const cfg = rl.config((name) => $os.getenv(name))
  $app
    .db()
    .newQuery('DELETE FROM guest_event_log WHERE created < {:c}')
    .bind({ c: rl.cutoff(new Date(), cfg.retentionMs) })
    .execute()
})
