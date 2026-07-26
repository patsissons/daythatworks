// Renders glyph atlases for the JSVM OG-image renderer (pb_hooks/lib/og-image.js).
// Each atlas is a raw alpha bitmap (1 byte/px) of a charset rendered in the app
// font, plus shared JSON metadata with per-glyph offsets/advances. Committed to
// pb_hooks/data/ so the PocketBase hook can rasterize text without any image
// libraries. Rerun with: node scripts/generate-og-font.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const CHARSET =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
  'abcdefghijklmnopqrstuvwxyz{|}~—·…★'
const FONT_STACK = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
const ATLASES = [
  { name: 'bold-72', size: 72, weight: 700 },
  { name: 'bold-36', size: 36, weight: 700 },
  { name: 'regular-36', size: 36, weight: 400 },
]

const browser = await chromium.launch()
const page = await browser.newPage()
mkdirSync('pb_hooks/data', { recursive: true })

const meta = { charset: CHARSET, atlases: {} }

for (const atlas of ATLASES) {
  const result = await page.evaluate(
    ({ charset, size, weight, fontStack }) => {
      const height = Math.ceil(size * 1.4)
      const baseline = Math.round(size * 1.05)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = `${weight} ${size}px ${fontStack}`
      const glyphs = {}
      const bitmaps = []
      let offset = 0
      for (const char of charset) {
        const advance = Math.max(1, Math.ceil(ctx.measureText(char).width))
        canvas.width = advance + 8
        canvas.height = height
        // canvas resets state on resize
        ctx.font = `${weight} ${size}px ${fontStack}`
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(char, 0, baseline)
        const data = ctx.getImageData(0, 0, advance, height).data
        const alpha = new Array(advance * height)
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
        glyphs[char] = { offset, width: advance }
        bitmaps.push(alpha)
        offset += advance * height
      }
      return { height, baseline, glyphs, bitmaps }
    },
    {
      charset: CHARSET,
      size: atlas.size,
      weight: atlas.weight,
      fontStack: FONT_STACK,
    },
  )

  const total = result.bitmaps.reduce((sum, bitmap) => sum + bitmap.length, 0)
  const bin = new Uint8Array(total)
  let cursor = 0
  for (const bitmap of result.bitmaps) {
    bin.set(bitmap, cursor)
    cursor += bitmap.length
  }
  writeFileSync(`pb_hooks/data/font-${atlas.name}.bin`, bin)
  meta.atlases[atlas.name] = {
    height: result.height,
    baseline: result.baseline,
    glyphs: result.glyphs,
  }
  console.log(`font-${atlas.name}.bin: ${bin.length} bytes`)
}

writeFileSync('pb_hooks/data/font-meta.json', JSON.stringify(meta))
console.log('font-meta.json written')
await browser.close()
