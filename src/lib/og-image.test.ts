import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

// JSVM CommonJS module (repo is type:module) — evaluate in a CJS wrapper.
const code = readFileSync('pb_hooks/lib/og-image.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)
const og = moduleRef.exports as {
  crc32: (bytes: Uint8Array, start: number, end: number) => number
  adler32: (bytes: Uint8Array) => number
  encodePng: (width: number, height: number, rgb: Uint8Array) => Uint8Array
  formatDay: (iso: string) => string
  buildCardData: (
    title: string,
    eventDates: string[],
    submissionDates: string[][],
  ) => {
    title: string
    subtitle: string
    total: number
    bestCount: number
    bestLabel: string
    moreDays: number
    rows: { label: string; count: number; fraction: number; best: boolean }[]
  }
}

describe('crc32 / adler32', () => {
  it('matches known vectors', () => {
    const iend = new TextEncoder().encode('IEND')
    expect(og.crc32(iend, 0, 4)).toBe(0xae426082)
    const abc = new TextEncoder().encode('abc')
    expect(og.adler32(abc)).toBe(0x024d0127)
  })
})

describe('encodePng', () => {
  it('produces a valid PNG that zlib can inflate back to the pixels', () => {
    const width = 4
    const height = 3
    const rgb = new Uint8Array(width * height * 3)
    rgb.fill(7)
    rgb[0] = 255 // distinguishable first pixel
    const png = og.encodePng(width, height, rgb)

    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    // IHDR dims
    const view = new DataView(png.buffer, png.byteOffset)
    expect(view.getUint32(16)).toBe(width)
    expect(view.getUint32(20)).toBe(height)

    // IDAT payload inflates to filtered scanlines
    expect(new TextDecoder().decode(png.slice(37, 41))).toBe('IDAT')
    const idatLen = view.getUint32(33)
    const raw = inflateSync(png.slice(41, 41 + idatLen))
    expect(raw.length).toBe(height * (1 + width * 3))
    expect(raw[0]).toBe(0) // filter byte
    expect(raw[1]).toBe(255)
    expect(raw[2]).toBe(7)
  })
})

describe('formatDay', () => {
  it('formats ISO dates', () => {
    expect(og.formatDay('2026-08-08')).toBe('Sat, Aug 8')
  })
})

describe('buildCardData', () => {
  const DATES = ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10']

  it('summarizes counts, best day, and overflow', () => {
    const card = og.buildCardData('BBQ', DATES, [
      ['2026-08-08'],
      ['2026-08-08', '2026-08-09'],
      ['2026-08-07', '2026-08-08'],
    ])
    expect(card.total).toBe(3)
    expect(card.bestCount).toBe(3)
    expect(card.bestLabel).toBe('Sat, Aug 8')
    expect(card.subtitle).toBe('3 people have responded · 4 candidate days')
    expect(card.rows).toHaveLength(3)
    const best = card.rows.find((row) => row.best)
    expect(best?.label).toBe('Sat, Aug 8')
    expect(best?.count).toBe(3)
    expect(card.moreDays).toBe(1)
  })

  it('handles zero submissions', () => {
    const card = og.buildCardData('BBQ', DATES.slice(0, 2), [])
    expect(card.total).toBe(0)
    expect(card.bestCount).toBe(0)
    expect(card.bestLabel).toBe('')
    expect(card.subtitle).toMatch(/No responses yet/)
    expect(card.rows.every((row) => !row.best && row.fraction === 0)).toBe(true)
  })

  it('keeps the top three days in chronological order', () => {
    const card = og.buildCardData('BBQ', DATES, [
      ['2026-08-09', '2026-08-10'],
      ['2026-08-10'],
    ])
    expect(card.rows.map((row) => row.count)).toEqual([0, 1, 2])
    expect(card.rows[2].label).toBe('Mon, Aug 10')
  })
})
