import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The OG helpers are a PocketBase JSVM CommonJS module (and the repo is
// type:module), so evaluate it in an explicit CJS wrapper like the JSVM does.
const code = readFileSync('pb_hooks/lib/og.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)
const og = moduleRef.exports as {
  escapeHtml: (value: string) => string
  metaText: (value: string, max: number) => string
  buildMeta: (fields: Record<string, unknown>) => string
  injectMeta: (html: string, fields: Record<string, unknown>) => string
  resolveOgImage: (opts: {
    origin: string
    eventId: string
    image: string
    imageUrl: string
    stats: { total: number; bestCount: number } | null
    cardVersion: number
  }) => { url: string; isDefault: boolean }
}

const PAGE =
  '<head>\n' +
  '    <!-- og:start (replaced per-event by pb_hooks/og.pb.js) -->\n' +
  '    <title>default</title>\n' +
  '    <meta property="og:title" content="default" />\n' +
  '    <!-- og:end -->\n' +
  '  </head>'

const FIELDS = {
  title: 'Summer BBQ — Day that works',
  description: 'Bring snacks & drinks',
  url: 'https://daythatworks.com/events/summer-bbq',
  image: 'https://daythatworks.com/og.png',
  imageIsDefault: true,
}

describe('escapeHtml', () => {
  it('escapes html-significant characters', () => {
    expect(og.escapeHtml('<b>"Tom & Jerry\'s"</b>')).toBe(
      '&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;',
    )
  })
})

describe('metaText', () => {
  it('collapses whitespace', () => {
    expect(og.metaText('a\n  b\t c', 100)).toBe('a b c')
  })

  it('truncates long text on a word boundary with an ellipsis', () => {
    const out = og.metaText('word '.repeat(100), 50)
    expect(out.length).toBeLessThanOrEqual(50)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('injectMeta', () => {
  it('replaces the marker block with event meta', () => {
    const out = og.injectMeta(PAGE, FIELDS)
    expect(out).toContain('<title>Summer BBQ — Day that works</title>')
    expect(out).toContain(
      '<meta property="og:title" content="Summer BBQ — Day that works" />',
    )
    expect(out).toContain(
      '<meta property="og:description" content="Bring snacks &amp; drinks" />',
    )
    expect(out).toContain(
      '<meta property="og:url" content="https://daythatworks.com/events/summer-bbq" />',
    )
    expect(out).toContain('<meta property="og:image:width" content="1200" />')
    expect(out).not.toContain('og:start')
    expect(out).not.toContain('<title>default</title>')
  })

  it('omits image dimensions for event-provided images', () => {
    const out = og.injectMeta(PAGE, {
      ...FIELDS,
      image: 'https://daythatworks.com/api/files/events/x/photo.jpg',
      imageIsDefault: false,
    })
    expect(out).toContain('/api/files/events/x/photo.jpg')
    expect(out).not.toContain('og:image:width')
  })

  it('returns html unchanged when markers are missing', () => {
    expect(og.injectMeta('<head></head>', FIELDS)).toBe('<head></head>')
  })

  it('escapes malicious event content', () => {
    const out = og.injectMeta(PAGE, {
      ...FIELDS,
      title: '"/><script>alert(1)</script>',
    })
    expect(out).not.toContain('<script>alert')
  })
})

describe('resolveOgImage', () => {
  const BASE = {
    origin: 'https://daythatworks.com',
    eventId: 'evt123',
    image: '',
    imageUrl: '',
    stats: null,
    cardVersion: 3,
  }

  it('prefers the external link over everything', () => {
    expect(
      og.resolveOgImage({
        ...BASE,
        image: 'photo.jpg',
        imageUrl: 'https://example.com/pic.png',
      }),
    ).toEqual({ url: 'https://example.com/pic.png', isDefault: false })
  })

  it('falls back to the uploaded file URL', () => {
    expect(og.resolveOgImage({ ...BASE, image: 'photo.jpg' })).toEqual({
      url: 'https://daythatworks.com/api/files/events/evt123/photo.jpg',
      isDefault: false,
    })
  })

  it('defaults to the stats card with a version cache-buster', () => {
    expect(
      og.resolveOgImage({ ...BASE, stats: { total: 4, bestCount: 3 } }),
    ).toEqual({
      url: 'https://daythatworks.com/api/og/events/evt123.png?v=3-4-3',
      isDefault: true,
    })
    expect(og.resolveOgImage(BASE)).toEqual({
      url: 'https://daythatworks.com/api/og/events/evt123.png',
      isDefault: true,
    })
  })
})
