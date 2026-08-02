import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FAQ_ITEMS } from '@/lib/faq'

// Like og.test.ts: the SEO helpers are a PocketBase JSVM CommonJS module, so
// evaluate them in an explicit CJS wrapper.
const code = readFileSync('pb_hooks/lib/seo.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)
const seo = moduleRef.exports as {
  FAQ_TITLE: string
  FAQ_DESCRIPTION: string
  FAQ_ITEMS: { question: string; answer: string }[]
  buildFaqJsonLd: () => {
    '@context': string
    '@type': string
    mainEntity: {
      '@type': string
      name: string
      acceptedAnswer: { '@type': string; text: string }
    }[]
  }
}

describe('seo.js FAQ content', () => {
  it('stays in exact sync with src/lib/faq.ts', () => {
    // The FAQ page (src/lib/faq.ts) and the crawler JSON-LD (pb_hooks/lib/
    // seo.js) live in different runtimes; this test is what keeps the copy
    // from drifting apart. Edit both files together.
    expect(seo.FAQ_ITEMS).toEqual(
      FAQ_ITEMS.map(({ question, answer }) => ({ question, answer })),
    )
  })

  it('builds a schema.org FAQPage with every question', () => {
    const jsonLd = seo.buildFaqJsonLd()
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('FAQPage')
    expect(jsonLd.mainEntity).toHaveLength(FAQ_ITEMS.length)
    for (const [index, entity] of jsonLd.mainEntity.entries()) {
      expect(entity['@type']).toBe('Question')
      expect(entity.name).toBe(FAQ_ITEMS[index].question)
      expect(entity.acceptedAnswer['@type']).toBe('Answer')
      expect(entity.acceptedAnswer.text).toBe(FAQ_ITEMS[index].answer)
    }
  })

  it('serializes to embeddable JSON', () => {
    expect(() => JSON.stringify(seo.buildFaqJsonLd())).not.toThrow()
  })
})
