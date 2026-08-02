// OpenGraph injection for event permalinks. Link unfurlers don't run the SPA's
// JavaScript, so pb_hooks/og.pb.js serves index.html with the block between
// the og:start/og:end markers rebuilt for the requested event.

var OG_START = '<!-- og:start'
var OG_END = '<!-- og:end -->'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Collapse whitespace and cap length for meta descriptions. */
function metaText(value, max) {
  var text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

/**
 * Build the replacement head block (title + description + og/twitter tags).
 * fields: { title, description, url, image, imageIsDefault, noindex, jsonLd }
 * jsonLd is a pre-serialized JSON string; noindex keeps search engines away
 * from unlisted pages while still letting unfurl crawlers read the OG tags.
 */
function buildMeta(fields) {
  var title = escapeHtml(fields.title)
  var description = escapeHtml(metaText(fields.description, 200))
  var url = escapeHtml(fields.url)
  var image = escapeHtml(fields.image)
  var lines = [
    '<title>' + title + '</title>',
    '<meta name="description" content="' + description + '" />',
    '<meta property="og:site_name" content="Day that works" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:title" content="' + title + '" />',
    '<meta property="og:description" content="' + description + '" />',
    '<meta property="og:url" content="' + url + '" />',
    '<meta property="og:image" content="' + image + '" />',
  ]
  if (fields.imageIsDefault) {
    lines.push('<meta property="og:image:width" content="1200" />')
    lines.push('<meta property="og:image:height" content="630" />')
  }
  lines.push('<meta name="twitter:card" content="summary_large_image" />')
  if (fields.noindex) {
    lines.push('<meta name="robots" content="noindex" />')
  }
  if (fields.jsonLd) {
    // < is identical JSON but can never terminate the script element
    lines.push(
      '<script type="application/ld+json">' +
        String(fields.jsonLd).replace(/</g, '\\u003c') +
        '</script>',
    )
  }
  return lines.join('\n    ')
}

/**
 * Pick the og:image source: external link > uploaded file > live stats card.
 * opts: { origin, eventId, image, imageUrl, stats, cardVersion }
 * Returns { url, isDefault } — isDefault only for the stats card, whose
 * 1200x630 dimensions are known.
 */
function resolveOgImage(opts) {
  if (opts.imageUrl) return { url: opts.imageUrl, isDefault: false }
  if (opts.image) {
    return {
      url: opts.origin + '/api/files/events/' + opts.eventId + '/' + opts.image,
      isDefault: false,
    }
  }
  return {
    url:
      opts.origin +
      '/api/og/events/' +
      opts.eventId +
      '.png' +
      (opts.stats
        ? '?v=' +
          opts.cardVersion +
          '-' +
          opts.stats.total +
          '-' +
          opts.stats.bestCount
        : ''),
    isDefault: true,
  }
}

/** Replace the marker block in index.html; returns html unchanged if markers are missing. */
function injectMeta(html, fields) {
  var start = html.indexOf(OG_START)
  var end = html.indexOf(OG_END)
  if (start === -1 || end === -1 || end < start) return html
  return (
    html.slice(0, start) + buildMeta(fields) + html.slice(end + OG_END.length)
  )
}

/**
 * Route handler for GET /events/{idOrSlug} (and submission permalinks):
 * serve the built index.html with event-specific meta when the event resolves,
 * or untouched when it doesn't (the SPA renders its own not-found state).
 * Uses PocketBase JSVM globals ($os, toString).
 */
function serveEventPage(e) {
  var html
  try {
    html = toString($os.readFile(__hooks + '/../pb_public/index.html'))
  } catch (err) {
    return e.next() // no built frontend (bare local instance)
  }

  var event = null
  try {
    event = e.app.findFirstRecordByFilter(
      'events',
      'id = {:value} || slug = {:value}',
      { value: e.request.pathValue('idOrSlug') },
    )
  } catch (err) {
    // unknown event — serve the default page
  }

  if (event) {
    var host = e.request.host
    var scheme =
      host.indexOf('127.') === 0 || host.indexOf('localhost') === 0
        ? 'http'
        : 'https'
    var origin = scheme + '://' + host

    var stats = null
    var cardVersion = 0
    try {
      var ogImage = require(__hooks + '/lib/og-image.js')
      cardVersion = ogImage.CARD_VERSION
      stats = ogImage.loadEventCardData(e.app, event)
    } catch (err) {
      // stats are a nice-to-have; fall back to static copy
    }

    var description =
      event.getString('description') ||
      'Pick the days that work for you and see which day fits the whole group.'
    if (stats && stats.total > 0 && stats.bestLabel) {
      description =
        'Best day so far: ' +
        stats.bestLabel +
        ' — ' +
        stats.bestCount +
        ' of ' +
        stats.total +
        ' available. ' +
        description
    }

    // external link wins, then the uploaded file; otherwise a live stats
    // card (?v busts crawler caches as responses come in)
    var resolved = resolveOgImage({
      origin: origin,
      eventId: event.id,
      image: event.getString('image'),
      imageUrl: event.getString('imageUrl'),
      stats: stats,
      cardVersion: cardVersion,
    })

    // noindex: events are unlisted share-by-link pages, not search results
    html = injectMeta(html, {
      title: event.getString('title') + ' — Day that works',
      description: description,
      url: origin + '/events/' + (event.getString('slug') || event.id),
      image: resolved.url,
      imageIsDefault: resolved.isDefault,
      noindex: true,
    })
  }

  return e.html(200, html)
}

module.exports = {
  escapeHtml,
  metaText,
  buildMeta,
  injectMeta,
  resolveOgImage,
  serveEventPage,
}
