import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The rate-limit helpers are a PocketBase JSVM CommonJS module (and the repo
// is type:module), so evaluate it in an explicit CJS wrapper like the JSVM
// does.
const code = readFileSync('pb_hooks/lib/rate-limit.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)
interface Limits {
  perIpLimit: number
  perUserLimit: number
  globalLimit: number
}

const rl = moduleRef.exports as {
  DEFAULTS: Limits & { windowHours: number }
  FALLBACK_SALT: string
  config: (getenv: (name: string) => string) => Limits & {
    windowMs: number
    retentionMs: number
    salt: string
    warnings: string[]
  }
  normalizeIp: (ip: unknown) => string
  hashIp: (ipKey: string, salt: string, sha256: (s: string) => string) => string
  cutoff: (now: Date, windowMs: number) => string
  decide: (
    counts: { ipCount: number; userCount: number; globalCount: number },
    limits: Limits,
  ) => { ok: boolean; reason?: string }
  limitMessage: (reason: string) => string
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const DAY_MS = 24 * 60 * 60 * 1000
const LIMITS = { perIpLimit: 5, perUserLimit: 5, globalLimit: 100 }

describe('normalizeIp', () => {
  it('passes IPv4 through unchanged', () => {
    expect(rl.normalizeIp('203.0.113.9')).toBe('203.0.113.9')
  })

  it('unwraps IPv4-mapped IPv6', () => {
    expect(rl.normalizeIp('::ffff:203.0.113.9')).toBe('203.0.113.9')
  })

  it('buckets IPv6 by /64 prefix', () => {
    expect(rl.normalizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe(
      '2001:0db8:85a3:08d3/64',
    )
  })

  it('expands :: compression', () => {
    expect(rl.normalizeIp('2001:db8::1')).toBe('2001:0db8:0000:0000/64')
    expect(rl.normalizeIp('::1')).toBe('0000:0000:0000:0000/64')
  })

  it('strips brackets and zone suffixes', () => {
    expect(rl.normalizeIp('[2001:db8::1]')).toBe('2001:0db8:0000:0000/64')
    expect(rl.normalizeIp('fe80::1%en0')).toBe('fe80:0000:0000:0000/64')
  })

  it('keys two hosts in the same /64 identically, different /64s apart', () => {
    const a = rl.normalizeIp('2001:db8:1:1::aaaa')
    const b = rl.normalizeIp('2001:db8:1:1::bbbb')
    const c = rl.normalizeIp('2001:db8:1:2::aaaa')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('falls back to a shared "unknown" key for garbage', () => {
    expect(rl.normalizeIp('')).toBe('unknown')
    expect(rl.normalizeIp(undefined)).toBe('unknown')
    expect(rl.normalizeIp('not-an-ip')).toBe('unknown')
    expect(rl.normalizeIp('1:2:3:4:5:6:7:8:9')).toBe('unknown')
  })
})

describe('hashIp', () => {
  it('produces a hex sha256 that varies with the salt', () => {
    const a = rl.hashIp('203.0.113.9', 'salt-a', sha256)
    const b = rl.hashIp('203.0.113.9', 'salt-b', sha256)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('uses the fallback salt deterministically when unset', () => {
    expect(rl.hashIp('203.0.113.9', '', sha256)).toBe(
      sha256(`${rl.FALLBACK_SALT}|203.0.113.9`),
    )
  })
})

describe('cutoff', () => {
  it('formats the window lower bound in PocketBase storage format', () => {
    const now = new Date('2026-08-02T12:00:00.000Z')
    expect(rl.cutoff(now, DAY_MS)).toBe('2026-08-01 12:00:00.000Z')
  })
})

describe('config', () => {
  it('falls back to defaults with a salt warning when nothing is set', () => {
    const cfg = rl.config(() => '')
    expect(cfg).toMatchObject({
      perIpLimit: rl.DEFAULTS.perIpLimit,
      perUserLimit: rl.DEFAULTS.perUserLimit,
      globalLimit: rl.DEFAULTS.globalLimit,
      windowMs: rl.DEFAULTS.windowHours * 60 * 60 * 1000,
      salt: rl.FALLBACK_SALT,
    })
    expect(cfg.retentionMs).toBe(2 * cfg.windowMs)
    expect(cfg.warnings).toEqual([
      expect.stringContaining('RATE_LIMIT_SALT is unset'),
    ])
  })

  it('reads overrides from the environment', () => {
    const env: Record<string, string> = {
      RATE_LIMIT_SALT: 'prod-salt',
      RATE_LIMIT_PER_IP: '10',
      RATE_LIMIT_PER_USER: '3',
      RATE_LIMIT_GLOBAL: '500',
      RATE_LIMIT_WINDOW_HOURS: '12',
    }
    const cfg = rl.config((name) => env[name] ?? '')
    expect(cfg).toMatchObject({
      perIpLimit: 10,
      perUserLimit: 3,
      globalLimit: 500,
      windowMs: 12 * 60 * 60 * 1000,
      retentionMs: 24 * 60 * 60 * 1000,
      salt: 'prod-salt',
    })
    expect(cfg.warnings).toEqual([])
  })

  it('warns and keeps the default for unparseable overrides', () => {
    const env: Record<string, string> = {
      RATE_LIMIT_SALT: 'prod-salt',
      RATE_LIMIT_PER_IP: 'lots',
      RATE_LIMIT_GLOBAL: '0',
    }
    const cfg = rl.config((name) => env[name] ?? '')
    expect(cfg.perIpLimit).toBe(rl.DEFAULTS.perIpLimit)
    expect(cfg.globalLimit).toBe(rl.DEFAULTS.globalLimit)
    expect(cfg.warnings).toEqual([
      expect.stringContaining('RATE_LIMIT_PER_IP="lots"'),
      expect.stringContaining('RATE_LIMIT_GLOBAL="0"'),
    ])
  })
})

describe('decide', () => {
  it('allows counts under every limit', () => {
    expect(
      rl.decide({ ipCount: 4, userCount: 4, globalCount: 99 }, LIMITS),
    ).toEqual({ ok: true })
  })

  it('rejects at each limit boundary with its reason', () => {
    expect(
      rl.decide({ ipCount: 5, userCount: 0, globalCount: 0 }, LIMITS),
    ).toEqual({ ok: false, reason: 'ip' })
    expect(
      rl.decide({ ipCount: 0, userCount: 5, globalCount: 0 }, LIMITS),
    ).toEqual({ ok: false, reason: 'user' })
    expect(
      rl.decide({ ipCount: 0, userCount: 0, globalCount: 100 }, LIMITS),
    ).toEqual({ ok: false, reason: 'global' })
  })

  it('respects custom limits', () => {
    const custom = { perIpLimit: 2, perUserLimit: 9, globalLimit: 9 }
    expect(
      rl.decide({ ipCount: 2, userCount: 0, globalCount: 0 }, custom),
    ).toEqual({ ok: false, reason: 'ip' })
  })

  it('reports the most specific reason first (user before ip)', () => {
    expect(
      rl.decide({ ipCount: 5, userCount: 5, globalCount: 100 }, LIMITS),
    ).toEqual({ ok: false, reason: 'user' })
  })
})

describe('limitMessage', () => {
  it('always suggests signing in', () => {
    for (const reason of ['ip', 'user', 'global']) {
      expect(rl.limitMessage(reason)).toMatch(/sign in/i)
    }
  })
})
