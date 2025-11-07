import { GET } from '../route'

describe('favicon route', () => {
  it('redirects to /icon.svg with 301', async () => {
    // Pass a minimal request-like object with a url
    const res: Response = await GET({ url: 'http://localhost/favicon.ico' } as any)

    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(301)

    // Response.redirect uses an absolute URL constructed from the request.url
    const location = res.headers.get('location')
    expect(location).toBe('http://localhost/icon.svg')
  })
})
import { GET } from '../route'

describe('favicon route', () => {
  it('redirects to /icon.svg with 301', async () => {
    const req: any = { url: 'https://example.com/favicon.ico' }

    // Mock the global Response.redirect used by Next's route handlers
    // Provide an object with status and headers.get(url)
    // @ts-ignore
    global.Response = {
      redirect(url: URL, status: number) {
        return {
          status,
          headers: {
            get(k: string) {
              if (k === 'location') return url.toString()
              return undefined
            }
          }
        }
      }
    }

    const res = await GET(req)

    expect(res).toBeDefined()
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://example.com/icon.svg')
  })
})
