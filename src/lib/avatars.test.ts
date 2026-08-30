import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The avatar helpers are a PocketBase JSVM CommonJS module (and the repo is
// type:module), so evaluate it in an explicit CJS wrapper like the JSVM does.
const code = readFileSync('pb_hooks/lib/avatars.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)

interface FakeRecord {
  id: string
  getString: (name: string) => string
  getBool?: (name: string) => boolean
  set: (name: string, value: string) => void
}

const avatars = moduleRef.exports as {
  resolveAvatarUrl: (user: FakeRecord) => string
  syncUserAvatar: (
    app: unknown,
    user: FakeRecord,
    providerUrl: string,
  ) => boolean
  githubFallbackUrl: (app: unknown, user: FakeRecord) => string
  backfillSubmissions: (app: unknown, user: FakeRecord) => void
}

function fakeUser(fields: Record<string, string | boolean> = {}) {
  const data: Record<string, string | boolean> = { id: 'user1', ...fields }
  return {
    id: String(data.id),
    fields: data,
    getString: (name: string) => String(data[name] ?? ''),
    getBool: (name: string) => data[name] === true,
    set: (name: string, value: string) => {
      data[name] = value
    },
  }
}

describe('resolveAvatarUrl', () => {
  it('prefers the captured provider URL', () => {
    const user = fakeUser({
      avatarUrl: 'https://example.com/a.png',
      avatar: 'file.png',
    })
    expect(avatars.resolveAvatarUrl(user)).toBe('https://example.com/a.png')
  })

  it('falls back to the avatar file path', () => {
    const user = fakeUser({ avatar: 'file.png' })
    expect(avatars.resolveAvatarUrl(user)).toBe(
      '/api/files/users/user1/file.png',
    )
  })

  it('returns empty when nothing is stored', () => {
    expect(avatars.resolveAvatarUrl(fakeUser())).toBe('')
  })
})

describe('syncUserAvatar', () => {
  function appSpy() {
    const saved: unknown[] = []
    return { saved, save: (record: unknown) => saved.push(record) }
  }

  it('saves a new provider URL', () => {
    const app = appSpy()
    const user = fakeUser()
    expect(avatars.syncUserAvatar(app, user, 'https://example.com/a.png')).toBe(
      true,
    )
    expect(user.getString('avatarUrl')).toBe('https://example.com/a.png')
    expect(app.saved).toHaveLength(1)
  })

  it('no-ops when the URL is unchanged', () => {
    const app = appSpy()
    const user = fakeUser({ avatarUrl: 'https://example.com/a.png' })
    expect(avatars.syncUserAvatar(app, user, 'https://example.com/a.png')).toBe(
      false,
    )
    expect(app.saved).toHaveLength(0)
  })

  it('rejects empty and non-http(s) URLs', () => {
    const app = appSpy()
    expect(avatars.syncUserAvatar(app, fakeUser(), '')).toBe(false)
    expect(avatars.syncUserAvatar(app, fakeUser(), 'javascript:alert(1)')).toBe(
      false,
    )
    expect(
      avatars.syncUserAvatar(app, fakeUser(), 'data:image/png;base64,x'),
    ).toBe(false)
    expect(app.saved).toHaveLength(0)
  })
})

describe('githubFallbackUrl', () => {
  function appWithAuths(auths: Array<Record<string, string>>) {
    return {
      findAllExternalAuthsByRecord: () =>
        auths.map((auth) => ({
          getString: (name: string) => auth[name] ?? '',
        })),
    }
  }

  it('builds the deterministic GitHub avatar URL', () => {
    const app = appWithAuths([
      { provider: 'google', providerId: '123' },
      { provider: 'github', providerId: '456' },
    ])
    expect(avatars.githubFallbackUrl(app, fakeUser())).toBe(
      'https://avatars.githubusercontent.com/u/456',
    )
  })

  it('returns empty without a GitHub link', () => {
    const app = appWithAuths([{ provider: 'google', providerId: '123' }])
    expect(avatars.githubFallbackUrl(app, fakeUser())).toBe('')
  })

  it('skips guest users entirely', () => {
    const app = {
      findAllExternalAuthsByRecord: () => {
        throw new Error('should not be called for guests')
      },
    }
    expect(avatars.githubFallbackUrl(app, fakeUser({ guest: true }))).toBe('')
  })
})

describe('backfillSubmissions', () => {
  it('stamps the resolved avatar onto stale submissions', () => {
    const stale = [fakeUser({ id: 'sub1' }), fakeUser({ id: 'sub2' })]
    const saved: unknown[] = []
    const filters: unknown[] = []
    const app = {
      findRecordsByFilter: (
        collection: string,
        filter: string,
        _sort: string,
        _limit: number,
        _offset: number,
        params: Record<string, string>,
      ) => {
        filters.push({ collection, filter, params })
        return stale
      },
      save: (record: unknown) => saved.push(record),
    }
    const user = fakeUser({ avatarUrl: 'https://example.com/a.png' })
    avatars.backfillSubmissions(app, user)
    expect(filters).toEqual([
      {
        collection: 'submissions',
        filter: 'submitter = {:user} && submitterAvatarUrl != {:avatar}',
        params: { user: 'user1', avatar: 'https://example.com/a.png' },
      },
    ])
    expect(saved).toHaveLength(2)
    expect(stale[0].getString('submitterAvatarUrl')).toBe(
      'https://example.com/a.png',
    )
  })
})
