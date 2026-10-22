import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The name helpers are a PocketBase JSVM CommonJS module (and the repo is
// type:module), so evaluate it in an explicit CJS wrapper like the JSVM does.
const code = readFileSync('pb_hooks/lib/names.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)

interface FakeRecord {
  id: string
  getString: (name: string) => string
  set: (name: string, value: string) => void
}

const names = moduleRef.exports as {
  syncUserName: (app: unknown, user: FakeRecord) => void
}

function fakeRecord(fields: Record<string, string> = {}) {
  const data: Record<string, string> = { id: 'user1', ...fields }
  return {
    id: data.id,
    getString: (name: string) => data[name] ?? '',
    set: (name: string, value: string) => {
      data[name] = value
    },
  }
}

function fakeApp(stale: Record<string, FakeRecord[]>) {
  const saved: unknown[] = []
  const queries: unknown[] = []
  return {
    saved,
    queries,
    findRecordsByFilter: (
      collection: string,
      filter: string,
      _sort: string,
      _limit: number,
      _offset: number,
      params: Record<string, string>,
    ) => {
      queries.push({ collection, filter, params })
      return stale[collection] ?? []
    },
    save: (record: unknown) => saved.push(record),
  }
}

describe('syncUserName', () => {
  it('re-stamps the name on stale submissions and events', () => {
    const submissions = [fakeRecord({ id: 'sub1', submitterName: 'Old' })]
    const events = [fakeRecord({ id: 'ev1', creatorName: 'Old' })]
    const app = fakeApp({ submissions, events })
    names.syncUserName(app, fakeRecord({ name: 'New' }))
    expect(app.queries).toEqual([
      {
        collection: 'submissions',
        filter: 'submitter = {:user} && submitterName != {:name}',
        params: { user: 'user1', name: 'New' },
      },
      {
        collection: 'events',
        filter: 'creator = {:user} && creatorName != {:name}',
        params: { user: 'user1', name: 'New' },
      },
    ])
    expect(app.saved).toEqual([submissions[0], events[0]])
    expect(submissions[0].getString('submitterName')).toBe('New')
    expect(events[0].getString('creatorName')).toBe('New')
  })

  it('clears the name everywhere when the user clears theirs', () => {
    const submissions = [fakeRecord({ id: 'sub1', submitterName: 'Gus' })]
    const app = fakeApp({ submissions })
    names.syncUserName(app, fakeRecord())
    expect(app.queries).toHaveLength(2)
    expect(submissions[0].getString('submitterName')).toBe('')
    expect(app.saved).toEqual([submissions[0]])
  })

  it('saves nothing when no records are stale', () => {
    const app = fakeApp({})
    names.syncUserName(app, fakeRecord({ name: 'Gus' }))
    expect(app.saved).toEqual([])
  })
})
