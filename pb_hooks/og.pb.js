/// <reference path="../pb_data/types.d.ts" />

// Serve event permalinks with event-specific OpenGraph tags so shared links
// unfurl properly (crawlers don't run the SPA). Unknown idOrSlug values —
// including the literal path /events/new — fall through to the untouched
// index.html and the SPA takes over.
routerAdd('GET', '/events/{idOrSlug}', (e) => {
  return require(`${__hooks}/lib/og.js`).serveEventPage(e)
})

routerAdd('GET', '/events/{idOrSlug}/s/{submissionId}', (e) => {
  return require(`${__hooks}/lib/og.js`).serveEventPage(e)
})

// Live stats card (PNG) used as the og:image for events without an uploaded
// image. The {id} segment may carry a .png suffix for crawler friendliness.
routerAdd('GET', '/api/og/events/{id}', (e) => {
  return require(`${__hooks}/lib/og-image.js`).serveEventImage(e)
})
