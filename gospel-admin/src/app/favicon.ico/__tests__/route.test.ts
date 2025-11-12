import { GET } from '../route'

describe('favicon route', () => {
  it('redirects to /icon.svg with 301', async () => {
    const req: any = { url: 'https://example.com/favicon.ico' }

    // Mock Response.redirect used by Next's route handlers. Prefer constructing
    // a real Response instance when available so types are satisfied.
    // @ts-ignore - intentionally overwrite for test
    global.Response = {
      redirect(url: URL | string, status?: number) {
        const statusCode = status ?? 302
        // If a native Response constructor exists, use it for a proper object
        // otherwise fall back to a minimal shape compatible with the assertions.
        // @ts-ignore
        if (typeof globalThis.Response === 'function') {
          try {
            return new (globalThis as any).Response(null, { status: statusCode, headers: { location: String(url) } })
          } catch (e) {
            // ignore and fallback
          }
        }
        return {
          status: statusCode,
          headers: {
            get(k: string) {
              if (k === 'location') return String(url)
              return undefined
            }
          }
        } as unknown as Response
      }
    }

    const res = await GET(req)

    expect(res).toBeDefined()
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://example.com/icon.svg')
  })
})
