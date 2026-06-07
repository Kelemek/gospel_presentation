import { NextRequest } from 'next/server'
import { GET } from '../route'
import { clearCrossReferencesCache } from '@/lib/cross-references'
import { ensureCrossReferenceTestFixtures } from '@/lib/test/ensureCrossReferenceTestFixtures'

describe('GET /api/scripture/cross-references', () => {
  beforeAll(() => {
    ensureCrossReferenceTestFixtures()
  })

  beforeEach(() => {
    clearCrossReferencesCache()
  })

  it('returns 400 without reference', async () => {
    const res = await GET(new NextRequest('http://localhost/api/scripture/cross-references'))
    expect(res.status).toBe(400)
  })

  it('returns cross references for Romans 8:28', async () => {
    const res = await GET(
      new NextRequest(
        'http://localhost/api/scripture/cross-references?reference=Romans%208%3A28&offset=0&limit=20'
      )
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBeGreaterThan(0)
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items[0]).toMatchObject({
      passageKey: expect.any(String),
      reference: expect.any(String),
      votes: expect.any(Number),
    })
  })

  it('returns 404 for unknown verse without links', async () => {
    const res = await GET(
      new NextRequest(
        'http://localhost/api/scripture/cross-references?reference=Romans%2099%3A99&offset=0&limit=20'
      )
    )
    expect(res.status).toBe(404)
  })
})
