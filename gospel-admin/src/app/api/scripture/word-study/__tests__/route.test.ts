/** @jest-environment node */

import { NextRequest } from 'next/server'
import { clearStepBibleWordsCache } from '@/lib/step-bible-words'
import { normalizeStrongsForLookup } from '@/lib/step-bible-text'
import { ensureStepBibleTestFixtures } from '@/lib/test/ensureStepBibleTestFixtures'

function wordHasStrongs(raw: string | undefined, key: string): boolean {
  return normalizeStrongsForLookup(raw ?? '')?.key === key
}

describe('GET /api/scripture/word-study', () => {
  beforeAll(() => {
    ensureStepBibleTestFixtures()
    clearStepBibleWordsCache()
  })

  it('returns 400 without reference', async () => {
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/scripture/word-study'))
    expect(res.status).toBe(400)
  })

  it('returns Greek words for Romans 12:2', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/word-study?reference=Romans%2012%3A2')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.passageKey).toBe('ROM.12.2')
    expect(body.language).toBe('grc')
    expect(body.verses).toHaveLength(1)
    expect(body.words.some((w: { strongs: string }) => wordHasStrongs(w.strongs, 'G3339'))).toBe(
      true
    )
  })

  it('returns a verse section per verse for Romans 12:2-3', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/word-study?reference=Romans%2012%3A2-3')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stepRef).toBe('Rom.12.2-3')
    expect(body.verses).toHaveLength(2)
    expect(body.verses[0].verse).toBe(2)
    expect(body.verses[1].verse).toBe(3)
    expect(
      body.verses[0].words.some((w: { strongs: string }) => wordHasStrongs(w.strongs, 'G3339'))
    ).toBe(true)
    expect(
      body.verses[1].words.some((w: { strongs: string }) => wordHasStrongs(w.strongs, 'G3004'))
    ).toBe(true)
  })

  it('returns 400 for chapter-only reference', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/word-study?reference=Psalm%2023')
    )
    expect(res.status).toBe(400)
  })

  it('returns 503 with error when STEPBible data is not installed', async () => {
    jest.resetModules()
    jest.doMock('@/lib/step-bible-words', () => ({
      ...jest.requireActual('@/lib/step-bible-words'),
      isStepBibleDataPresent: () => false,
    }))
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/word-study?reference=Romans%2012%3A2')
    )
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('Word study data is not installed on this server.')
    expect(body.unavailableReason).toBe('Word study data is not installed on this server.')
    jest.dontMock('@/lib/step-bible-words')
  })
})
