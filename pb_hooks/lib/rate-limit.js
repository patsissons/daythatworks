// Sliding-window rate limiting for guest event creation. Pure logic only —
// no PocketBase globals — so it can be unit tested from vitest (see
// src/lib/rate-limit.test.ts). Callers inject sha256, getenv, and the
// current time.

const DEFAULTS = {
  perIpLimit: 5,
  perUserLimit: 5,
  globalLimit: 100,
  windowHours: 24,
}

// Used when RATE_LIMIT_SALT is unset (local dev); prod should always set the
// secret so IP hashes aren't reversible via rainbow tables.
const FALLBACK_SALT = 'daythatworks-dev-salt'

// Resolves the effective limits from env vars (PocketHost secrets), falling
// back to DEFAULTS. Returns { ...limits, windowMs, retentionMs, salt,
// warnings } where warnings lists anything the caller should log (unset
// salt, unparseable overrides).
function config(getenv) {
  const warnings = []
  function envInt(name, fallback) {
    const raw = getenv(name)
    if (!raw) return fallback
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 1) {
      warnings.push(`ignoring ${name}="${raw}" (want a positive integer); using ${fallback}`)
      return fallback
    }
    return value
  }
  const salt = getenv('RATE_LIMIT_SALT')
  if (!salt) warnings.push('RATE_LIMIT_SALT is unset; using fallback salt')
  const windowHours = envInt('RATE_LIMIT_WINDOW_HOURS', DEFAULTS.windowHours)
  const windowMs = windowHours * 60 * 60 * 1000
  return {
    perIpLimit: envInt('RATE_LIMIT_PER_IP', DEFAULTS.perIpLimit),
    perUserLimit: envInt('RATE_LIMIT_PER_USER', DEFAULTS.perUserLimit),
    globalLimit: envInt('RATE_LIMIT_GLOBAL', DEFAULTS.globalLimit),
    windowMs,
    retentionMs: 2 * windowMs,
    salt: salt || FALLBACK_SALT,
    warnings,
  }
}

// Rate-limit key for an IP: IPv4 addresses stand alone, IPv6 is bucketed by
// /64 prefix (a single host can rotate freely within its /64).
function normalizeIp(ip) {
  let s = String(ip || '').trim()
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1)
  const zone = s.indexOf('%')
  if (zone !== -1) s = s.slice(0, zone)
  s = s.toLowerCase()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return s
  const mapped = /^::ffff:(\d{1,3}(\.\d{1,3}){3})$/.exec(s)
  if (mapped) return mapped[1]
  if (s.includes(':')) {
    const hextets = expandIpv6(s)
    if (hextets) return hextets.slice(0, 4).join(':') + '/64'
  }
  return 'unknown'
}

// Expands `::` compression into the full 8 hextets (each padded to 4 chars),
// or returns null if the input isn't plausible IPv6.
function expandIpv6(s) {
  const parts = s.split('::')
  if (parts.length > 2) return null
  const head = parts[0] ? parts[0].split(':') : []
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (parts.length === 2 ? missing < 0 : missing !== 0) return null
  const hextets = head.concat(Array(parts.length === 2 ? missing : 0).fill('0'), tail)
  if (hextets.length !== 8) return null
  const out = []
  for (let i = 0; i < 8; i++) {
    if (!/^[0-9a-f]{1,4}$/.test(hextets[i])) return null
    out.push(hextets[i].padStart(4, '0'))
  }
  return out
}

function hashIp(ipKey, salt, sha256) {
  return sha256((salt || FALLBACK_SALT) + '|' + ipKey)
}

// Lower bound of the window as a UTC string in PocketBase's stored format
// (YYYY-MM-DD HH:MM:SS.mmmZ), which compares lexicographically in SQLite.
function cutoff(now, windowMs) {
  const d = new Date(now.getTime() - windowMs)
  return d.toISOString().replace('T', ' ')
}

function decide(counts, limits) {
  if (counts.userCount >= limits.perUserLimit) return { ok: false, reason: 'user' }
  if (counts.ipCount >= limits.perIpLimit) return { ok: false, reason: 'ip' }
  if (counts.globalCount >= limits.globalLimit) return { ok: false, reason: 'global' }
  return { ok: true }
}

function limitMessage(reason) {
  if (reason === 'global') {
    return 'Guest event creation is busy right now — try again later, or sign in to create events.'
  }
  return 'Guest event limit reached — try again tomorrow, or sign in to create more events.'
}

module.exports = {
  DEFAULTS,
  FALLBACK_SALT,
  config,
  normalizeIp,
  hashIp,
  cutoff,
  decide,
  limitMessage,
}
