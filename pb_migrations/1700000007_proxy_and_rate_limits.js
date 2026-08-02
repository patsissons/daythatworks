/// <reference path="../pb_data/types.d.ts" />

// Client IPs + coarse rate limits: PocketHost fronts the instance with a
// proxy, so realIP() needs a trustedProxy config to read X-Forwarded-For
// (rightmost entry — appended by the trusted proxy, not client-spoofable).
// The built-in limiter is only a burst backstop; the real guest-creation
// budget lives in pb_hooks (sliding 24h window over guest_event_log). Note
// the built-in `@guest` audience means unauthenticated — our guest users are
// authenticated — so these rules apply to everyone.
migrate(
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = ['X-Forwarded-For']
    settings.trustedProxy.useLeftmostIP = false
    settings.rateLimits.enabled = true
    settings.rateLimits.rules = [
      { label: 'events:create', audience: '', duration: 60, maxRequests: 10 },
      { label: 'POST /api/guest-login', audience: '', duration: 3600, maxRequests: 30 },
    ]
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = []
    settings.trustedProxy.useLeftmostIP = false
    settings.rateLimits.enabled = false
    settings.rateLimits.rules = []
    app.save(settings)
  },
)
