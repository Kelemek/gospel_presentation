import { GET } from '../route'

describe('scripture API error branches', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.ESV_API_TOKEN = 'tok'
  })

  it('returns 500 when ESV API responds non-ok', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })

    const req: any = { url: 'https://example.com/api/scripture?reference=John+3:16' }
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to fetch scripture text|ESV API error/i)
  })

  it('returns 404 when no passages present', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ passages: [] }) })

    const req: any = { url: 'https://example.com/api/scripture?reference=Unknown+Ref' }
    const res = await GET(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/Scripture text not found/i)
  })
})
