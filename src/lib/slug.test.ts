import { describe, expect, it } from 'vitest'
import { isValidSlug, suggestSlug } from '@/lib/slug'

describe('isValidSlug', () => {
  it('accepts lowercase alphanumerics with single hyphens', () => {
    expect(isValidSlug('summer-bbq')).toBe(true)
    expect(isValidSlug('party2026')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
  })

  it('rejects uppercase, spaces, and stray hyphens', () => {
    expect(isValidSlug('Summer-BBQ')).toBe(false)
    expect(isValidSlug('summer bbq')).toBe(false)
    expect(isValidSlug('-summer')).toBe(false)
    expect(isValidSlug('summer-')).toBe(false)
    expect(isValidSlug('summer--bbq')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('suggestSlug', () => {
  it('slugifies titles', () => {
    expect(suggestSlug('Summer BBQ!')).toBe('summer-bbq')
    expect(suggestSlug('  Team   Offsite 2026  ')).toBe('team-offsite-2026')
  })

  it('strips accents', () => {
    expect(suggestSlug('Café Soirée')).toBe('cafe-soiree')
  })

  it('returns an empty string for unusable titles', () => {
    expect(suggestSlug('!!!')).toBe('')
  })

  it('always produces a valid slug or empty string', () => {
    for (const title of [
      'Summer BBQ!',
      'Café Soirée',
      'a-b-c',
      'x'.repeat(300),
    ]) {
      const slug = suggestSlug(title)
      expect(slug === '' || isValidSlug(slug)).toBe(true)
    }
  })
})
