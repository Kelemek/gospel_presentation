import { GET } from '../../test/route'

describe('/api/test route', () => {
  it('returns OK payload', async () => {
    const response = await GET()
    // NextResponse.json returns a response-like object with a json() method
    const data = await response.json()

    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('message')
    expect(typeof data.timestamp).toBe('string')
  })
})
