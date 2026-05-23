/** @jest-environment node */

import { NextRequest } from 'next/server'
import { clearStepBibleConcordanceCache } from '@/lib/step-bible-concordance'
import {
  ensureStepBibleTestFixtures,
  stepBibleHasFullWordImport,
} from '@/lib/test/ensureStepBibleTestFixtures'

describe('GET /api/scripture/concordance', () => {
  beforeAll(() => {
    ensureStepBibleTestFixtures()
    clearStepBibleConcordanceCache()
  })

  it('returns paginated occurrences for Greek Strong’s', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/concordance?strongs=G3339&offset=0&limit=50')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.strongs).toBe('G3339')
    expect(body.total).toBeGreaterThanOrEqual(1)
    const rom122 = body.occurrences.find(
      (o: { passageKey: string }) => o.passageKey === 'ROM.12.2'
    )
    expect(rom122?.reference).toBe('Romans 12:2')
  })

  it('returns Hebrew concordance', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/concordance?strongs=H430')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.strongs).toBe('H430')
    if (stepBibleHasFullWordImport()) {
      expect(body.total).toBeGreaterThan(100)
    } else {
      expect(body.occurrences[0].reference).toBe('Genesis 1:1')
    }
  })

  it('returns 404 for unknown Strong’s', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/concordance?strongs=G999999')
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when strongs is missing', async () => {
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/scripture/concordance'))
    expect(res.status).toBe(400)
  })
})
