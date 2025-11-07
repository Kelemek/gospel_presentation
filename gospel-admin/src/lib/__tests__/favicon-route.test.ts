import { GET } from '@/app/favicon.ico/route'

describe('favicon route (coverage shim)', () => {
  it('redirects to /icon.svg (absolute URL) with 301', async () => {
    const res: Response = await GET({ url: 'http://localhost/favicon.ico' } as any)
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('http://localhost/icon.svg')
  })
})
