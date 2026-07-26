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
 * fields: { title, description, url, image, imageIsDefault }
 */
function buildMeta(fields) {
  var title = escapeHtml(fields.title)
  var description = escapeHtml(metaText(fields.description, 200))
  var url = escapeHtml(fields.url)
  var image = escapeHtml(fields.image)
  var lines = [
    '<title>' + title + '</title>',
    '<meta name="description" content="' + description + '" />',
    '<meta property="og:site_name" content="daythatworks" />',
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
  return lines.join('\n    ')
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
    var image = event.getString('image')
    html = injectMeta(html, {
      title: event.getString('title') + ' — daythatworks',
      description:
        event.getString('description') ||
        'Pick the days that work for you and see which day fits the whole group.',
      url: origin + '/events/' + (event.getString('slug') || event.id),
      image: image
        ? origin + '/api/files/events/' + event.id + '/' + image
        : origin + '/og.png',
      imageIsDefault: !image,
    })
  }

  return e.html(200, html)
}

module.exports = { escapeHtml, metaText, buildMeta, injectMeta, serveEventPage }
