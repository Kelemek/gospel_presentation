import { GET } from '../route'

describe('favicon route', () => {
  it('redirects to /icon.svg with 301', async () => {
    const req: any = { url: 'https://example.com/favicon.ico' }

    const res = await GET(req)

    expect(res).toBeDefined()
    expect(res.status).toBe(301)
    // location header should be the absolute URL to /icon.svg
    expect(res.headers.get('location')).toBe('https://example.com/icon.svg')
  })
})
