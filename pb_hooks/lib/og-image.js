// Dynamic OpenGraph card renderer for event permalinks, running entirely in
// the PocketBase JSVM (no image libraries): text comes from pre-rendered glyph
// atlases (scripts/generate-og-font.mjs → pb_hooks/data/), shapes are drawn
// into an RGB buffer, and the result is encoded as a PNG using zlib "stored"
// deflate blocks with hand-rolled CRC32/Adler32.

// Bump when the card layout/design changes: it feeds the og:image ?v cache
// key so crawlers and edge caches refetch after a deploy.
var CARD_VERSION = 3

var WIDTH = 1200
var HEIGHT = 630

// The card is monochrome, so pixels are single grayscale bytes — a third of
// the raw size of RGB, and PNG color type 0 encodes it directly.
var COLOR_BG = 10
var COLOR_WHITE = 250
var COLOR_MUTED = 163
var COLOR_TRACK = 38
var COLOR_BORDER = 114

// ---------------------------------------------------------------------------
// PNG encoding

var CRC_TABLE = (function () {
  var table = new Int32Array(256)
  for (var n = 0; n < 256; n++) {
    var c = n
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(bytes, start, end) {
  var crc = -1
  for (var i = start; i < end; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

function adler32(bytes) {
  var a = 1
  var b = 0
  for (var i = 0; i < bytes.length; i++) {
    a += bytes[i]
    if (a >= 65521) a -= 65521
    b += a
    b %= 65521
  }
  return ((b << 16) | a) >>> 0
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}

// RFC 1951 length-code table for match lengths 3..258:
// [firstLength, code, extraBits] per bucket.
var LENGTH_CODES = [
  [3, 257, 0], [4, 258, 0], [5, 259, 0], [6, 260, 0], [7, 261, 0],
  [8, 262, 0], [9, 263, 0], [10, 264, 0], [11, 265, 1], [13, 266, 1],
  [15, 267, 1], [17, 268, 1], [19, 269, 2], [23, 270, 2], [27, 271, 2],
  [31, 272, 2], [35, 273, 3], [43, 274, 3], [51, 275, 3], [59, 276, 3],
  [67, 277, 4], [83, 278, 4], [99, 279, 4], [115, 280, 4], [131, 281, 5],
  [163, 282, 5], [195, 283, 5], [227, 284, 5], [258, 285, 0],
]

/**
 * Fixed-Huffman deflate with distance-1 run matches — small and fast for
 * images dominated by flat fills, and standard inflaters decode it fine.
 */
function deflateFixed(data) {
  var out = []
  var cur = 0
  var nbits = 0
  function putBits(value, count) {
    cur |= value << nbits
    nbits += count
    while (nbits >= 8) {
      out.push(cur & 0xff)
      cur >>>= 8
      nbits -= 8
    }
  }
  function putCode(code, len) {
    // huffman codes pack most-significant bit first
    var rev = 0
    for (var i = 0; i < len; i++) rev = (rev << 1) | ((code >> i) & 1)
    putBits(rev, len)
  }
  function putLiteral(value) {
    if (value <= 143) putCode(0x30 + value, 8)
    else putCode(0x190 + (value - 144), 9)
  }
  function putLength(len) {
    var bucket = LENGTH_CODES[0]
    for (var i = 0; i < LENGTH_CODES.length; i++) {
      if (LENGTH_CODES[i][0] > len) break
      bucket = LENGTH_CODES[i]
    }
    var code = bucket[1]
    if (code <= 279) putCode(code - 256, 7)
    else putCode(0xc0 + (code - 280), 8)
    if (bucket[2] > 0) putBits(len - bucket[0], bucket[2])
  }

  putBits(1, 1) // BFINAL
  putBits(1, 2) // BTYPE: fixed huffman
  var i = 0
  while (i < data.length) {
    if (i > 0 && data[i] === data[i - 1]) {
      var prev = data[i - 1]
      var run = 0
      while (run < 258 && i + run < data.length && data[i + run] === prev) {
        run++
      }
      if (run >= 3) {
        putLength(run)
        putCode(0, 5) // distance code 0 = distance 1
        i += run
        continue
      }
    }
    putLiteral(data[i])
    i++
  }
  putCode(0, 7) // end of block (symbol 256)
  if (nbits > 0) out.push(cur & 0xff)
  return Uint8Array.from(out)
}

/** Encode a grayscale buffer (width*height, 1 byte/px) as a PNG. */
function encodePng(width, height, gray) {
  // scanlines with filter byte 0
  var filtered = new Uint8Array(height * (width + 1))
  for (var y = 0; y < height; y++) {
    var src = y * width
    filtered.set(gray.subarray(src, src + width), y * (width + 1) + 1)
  }

  // zlib stream: header + fixed-huffman deflate + adler
  var deflated = deflateFixed(filtered)
  var zlib = new Uint8Array(2 + deflated.length + 4)
  zlib[0] = 0x78
  zlib[1] = 0x01
  zlib.set(deflated, 2)
  writeUint32(zlib, 2 + deflated.length, adler32(filtered))

  // chunks
  var png = new Uint8Array(8 + 25 + 12 + zlib.length + 12)
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  var p = 8
  // IHDR
  writeUint32(png, p, 13)
  png.set([0x49, 0x48, 0x44, 0x52], p + 4)
  writeUint32(png, p + 8, width)
  writeUint32(png, p + 12, height)
  png[p + 16] = 8 // bit depth
  png[p + 17] = 0 // color type: grayscale
  writeUint32(png, p + 21, crc32(png, p + 4, p + 21))
  p += 25
  // IDAT
  writeUint32(png, p, zlib.length)
  png.set([0x49, 0x44, 0x41, 0x54], p + 4)
  png.set(zlib, p + 8)
  writeUint32(png, p + 8 + zlib.length, crc32(png, p + 4, p + 8 + zlib.length))
  p += 12 + zlib.length
  // IEND
  writeUint32(png, p, 0)
  png.set([0x49, 0x45, 0x4e, 0x44], p + 4)
  writeUint32(png, p + 8, crc32(png, p + 4, p + 8))
  return png
}

// ---------------------------------------------------------------------------
// Drawing

function makeCanvas() {
  var data = new Uint8Array(WIDTH * HEIGHT)
  data.fill(COLOR_BG)
  return data
}

/** Horizontal span fill (solid gray value). */
function span(data, y, x0, x1, color) {
  if (y < 0 || y >= HEIGHT) return
  if (x0 < 0) x0 = 0
  if (x1 > WIDTH) x1 = WIDTH
  if (x1 > x0) data.fill(color, y * WIDTH + x0, y * WIDTH + x1)
}

function fillRoundRect(data, x, y, w, h, radius, color) {
  var r = Math.min(radius, Math.floor(h / 2), Math.floor(w / 2))
  for (var dy = 0; dy < h; dy++) {
    var inset = 0
    var edge = dy < r ? r - dy - 0.5 : dy >= h - r ? dy - (h - r) + 0.5 : -1
    if (edge >= 0) {
      inset = r - Math.sqrt(Math.max(0, r * r - edge * edge))
    }
    span(data, y + dy, Math.round(x + inset), Math.round(x + w - inset), color)
  }
}

/** Stroke-only rounded rect (border width bw) by drawing rim spans. */
function strokeRoundRect(data, x, y, w, h, radius, bw, color) {
  var r = Math.min(radius, Math.floor(h / 2))
  for (var dy = 0; dy < h; dy++) {
    var edge = dy < r ? r - dy - 0.5 : dy >= h - r ? dy - (h - r) + 0.5 : -1
    var inset =
      edge >= 0 ? r - Math.sqrt(Math.max(0, r * r - edge * edge)) : 0
    var innerEdge = edge >= 0 ? edge + bw : -1
    var innerInset =
      innerEdge >= 0 && innerEdge <= r
        ? r - Math.sqrt(Math.max(0, r * r - innerEdge * innerEdge))
        : 0
    var left = Math.round(x + inset)
    var right = Math.round(x + w - inset)
    if (dy < bw || dy >= h - bw || edge >= r - bw) {
      span(data, y + dy, left, right, color)
    } else {
      span(data, y + dy, left, Math.round(x + Math.max(inset + bw, innerInset)), color)
      span(data, y + dy, Math.round(x + w - Math.max(inset + bw, innerInset)), right, color)
    }
  }
}

function glyphFor(atlas, char) {
  return atlas.glyphs[char] || atlas.glyphs['?']
}

function measureText(atlas, text) {
  var width = 0
  for (var i = 0; i < text.length; i++) {
    width += glyphFor(atlas, text[i]).width
  }
  return width
}

function truncateText(atlas, text, maxWidth) {
  if (measureText(atlas, text) <= maxWidth) return text
  var ellipsis = glyphFor(atlas, '…').width
  var width = 0
  var end = 0
  for (var i = 0; i < text.length; i++) {
    var next = width + glyphFor(atlas, text[i]).width
    if (next + ellipsis > maxWidth) break
    width = next
    end = i + 1
  }
  return text.slice(0, end).replace(/\s+$/, '') + '…'
}

/** Draw text with the glyph cell's top-left at (x, y). Returns end x. */
function drawText(data, atlas, bin, text, x, y, color) {
  var cursor = Math.round(x)
  for (var i = 0; i < text.length; i++) {
    var glyph = glyphFor(atlas, text[i])
    for (var gy = 0; gy < atlas.height; gy++) {
      var py = y + gy
      if (py < 0 || py >= HEIGHT) continue
      var rowBase = glyph.offset + gy * glyph.width
      for (var gx = 0; gx < glyph.width; gx++) {
        var alpha = bin[rowBase + gx]
        if (!alpha) continue
        var px = cursor + gx
        if (px < 0 || px >= WIDTH) continue
        var p = py * WIDTH + px
        data[p] = (color * alpha + data[p] * (255 - alpha) + 127) / 255
      }
    }
    cursor += glyph.width
  }
  return cursor
}

// ---------------------------------------------------------------------------
// Event data → card

var MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
var DAYS = 'Sun Mon Tue Wed Thu Fri Sat'.split(' ')

function formatDay(iso) {
  var year = parseInt(iso.slice(0, 4), 10)
  var month = parseInt(iso.slice(5, 7), 10)
  var day = parseInt(iso.slice(8, 10), 10)
  var date = new Date(year, month - 1, day, 12)
  return DAYS[date.getDay()] + ', ' + MONTHS[month - 1] + ' ' + day
}

/**
 * Aggregate an event's submissions into card data.
 * eventDates: string[]; submissionDates: string[][]
 */
function buildCardData(title, eventDates, submissionDates) {
  var total = submissionDates.length
  var counts = eventDates.map(function (date) {
    var count = 0
    for (var i = 0; i < submissionDates.length; i++) {
      if (submissionDates[i].indexOf(date) !== -1) count++
    }
    return { date: date, count: count }
  })
  var bestCount = 0
  for (var i = 0; i < counts.length; i++) {
    if (counts[i].count > bestCount) bestCount = counts[i].count
  }
  var rows = counts
    .slice()
    .sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.date < b.date ? -1 : 1
    })
    .slice(0, 3)
    .sort(function (a, b) {
      return a.date < b.date ? -1 : 1
    })
    .map(function (entry) {
      return {
        label: formatDay(entry.date),
        count: entry.count,
        fraction: total > 0 ? entry.count / total : 0,
        best: bestCount > 0 && entry.count === bestCount,
      }
    })
  var subtitle
  if (total === 0) {
    subtitle = 'No responses yet — add which days work for you'
  } else {
    subtitle =
      total +
      (total === 1 ? ' person has' : ' people have') +
      ' responded · ' +
      eventDates.length +
      ' candidate days'
  }
  var bestLabel = ''
  for (var j = 0; j < rows.length; j++) {
    if (rows[j].best) {
      bestLabel = rows[j].label
      break
    }
  }
  return {
    title: title,
    subtitle: subtitle,
    rows: rows,
    total: total,
    bestCount: bestCount,
    bestLabel: bestLabel,
    moreDays: Math.max(0, eventDates.length - 3),
  }
}

/**
 * Render the card. assets = { meta: parsed font-meta.json, bins: {name: bytes} }
 */
function renderEventCard(assets, card) {
  var bold72 = assets.meta.atlases['bold-72']
  var bold36 = assets.meta.atlases['bold-36']
  var regular36 = assets.meta.atlases['regular-36']
  var bin72 = assets.bins['bold-72']
  var bin36 = assets.bins['bold-36']
  var binR36 = assets.bins['regular-36']

  var data = makeCanvas()

  drawText(data, bold36, bin36, 'Day that works', 80, 52, COLOR_WHITE)
  drawText(
    data,
    bold72,
    bin72,
    truncateText(bold72, card.title, 1040),
    80,
    128,
    COLOR_WHITE,
  )
  drawText(data, regular36, binR36, card.subtitle, 80, 242, COLOR_MUTED)

  var rowY = 322
  for (var i = 0; i < card.rows.length; i++) {
    var row = card.rows[i]
    drawText(data, bold36, bin36, row.label, 80, rowY, COLOR_WHITE)
    var trackY = rowY + Math.round(bold36.height / 2) - 9
    fillRoundRect(data, 330, trackY, 400, 18, 9, COLOR_TRACK)
    var fillWidth = Math.round(400 * row.fraction)
    if (fillWidth > 0) {
      fillRoundRect(data, 330, trackY, Math.max(fillWidth, 18), 18, 9, COLOR_WHITE)
    }
    var countText = row.count + '/' + card.total
    drawText(data, regular36, binR36, countText, 758, rowY, COLOR_MUTED)
    if (row.best) {
      var badgeText = '★ Best day'
      var badgeTextWidth = measureText(bold36, badgeText)
      var badgeX = 1120 - (badgeTextWidth + 48)
      var badgeY = rowY - 6
      var badgeH = bold36.height + 10
      strokeRoundRect(
        data,
        badgeX,
        badgeY,
        badgeTextWidth + 48,
        badgeH,
        Math.floor(badgeH / 2),
        2,
        COLOR_BORDER,
      )
      drawText(data, bold36, bin36, badgeText, badgeX + 24, rowY - 1, COLOR_WHITE)
    }
    rowY += 76
  }

  if (card.moreDays > 0) {
    drawText(
      data,
      regular36,
      binR36,
      '+ ' + card.moreDays + ' more ' + (card.moreDays === 1 ? 'day' : 'days'),
      80,
      rowY,
      COLOR_MUTED,
    )
  }

  return encodePng(WIDTH, HEIGHT, data)
}

// ---------------------------------------------------------------------------
// JSVM glue (uses $os / __hooks globals; not exercised by unit tests)

var assetsCache = null

function toBytes(raw) {
  if (raw instanceof Uint8Array) return raw
  var out = new Uint8Array(raw.length)
  for (var i = 0; i < raw.length; i++) out[i] = raw[i]
  return out
}

function loadAssets() {
  if (assetsCache) return assetsCache
  var meta = JSON.parse(toString($os.readFile(__hooks + '/data/font-meta.json')))
  var bins = {}
  for (var name in meta.atlases) {
    bins[name] = toBytes($os.readFile(__hooks + '/data/font-' + name + '.bin'))
  }
  assetsCache = { meta: meta, bins: bins }
  return assetsCache
}

function readDatesField(record) {
  var raw = record.getString('dates')
  if (!raw) return []
  try {
    var parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

/** Fetch event + submissions and build card data (shared with og.js). */
function loadEventCardData(app, event) {
  var submissions = app.findRecordsByFilter(
    'submissions',
    'event = {:id}',
    'created',
    500,
    0,
    { id: event.id },
  )
  var submissionDates = []
  for (var i = 0; i < submissions.length; i++) {
    submissionDates.push(readDatesField(submissions[i]))
  }
  return buildCardData(
    event.getString('title'),
    readDatesField(event),
    submissionDates,
  )
}

/** Route handler for GET /api/og/events/{id} (id may carry a .png suffix). */
function serveEventImage(e) {
  var id = e.request.pathValue('id')
  if (id.slice(-4) === '.png') id = id.slice(0, -4)
  var event
  try {
    event = e.app.findRecordById('events', id)
  } catch (err) {
    return e.notFoundError('no such event', err)
  }
  var card = loadEventCardData(e.app, event)
  var png = renderEventCard(loadAssets(), card)
  e.response.header().set('Cache-Control', 'public, max-age=300')
  return e.blob(200, 'image/png', png)
}

module.exports = {
  CARD_VERSION: CARD_VERSION,
  deflateFixed: deflateFixed,
  crc32: crc32,
  adler32: adler32,
  encodePng: encodePng,
  measureText: measureText,
  truncateText: truncateText,
  formatDay: formatDay,
  buildCardData: buildCardData,
  renderEventCard: renderEventCard,
  loadEventCardData: loadEventCardData,
  serveEventImage: serveEventImage,
}
