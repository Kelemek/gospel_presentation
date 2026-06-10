import { GET } from '../route'

describe('/api/app-deploy-version route', () => {
  it('returns a non-empty version string', async () => {
    const response = await GET()
    const data = await response.json()

    expect(typeof data.version).toBe('string')
    expect(data.version.length).toBeGreaterThan(0)
  })
})
