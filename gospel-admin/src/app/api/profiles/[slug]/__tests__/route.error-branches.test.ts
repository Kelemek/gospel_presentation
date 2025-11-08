import { jest } from '@jest/globals'

describe('profiles/[slug] route error branches', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('PUT returns 404 when updateProfile throws not found', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      updateProfile: () => { throw new Error('not found') }
    }))

    const mod = await import('../route')
    const { PUT } = mod

    const req: any = { json: async () => ({ title: 'New' }) }
    const res = await PUT(req, { params: Promise.resolve({ slug: 'missing' }) } as any)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('DELETE returns 404 when deleteProfile throws not found', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      deleteProfile: () => { throw new Error('not found') }
    }))

    const mod = await import('../route')
    const { DELETE } = mod

    const res = await DELETE({} as any, { params: Promise.resolve({ slug: 'missing' }) } as any)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('DELETE returns 403 when deleteProfile rejects with default-profile message', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      deleteProfile: () => { throw new Error('Cannot delete the default profile') }
    }))

    const mod = await import('../route')
    const { DELETE } = mod

    const res = await DELETE({} as any, { params: Promise.resolve({ slug: 'default' }) } as any)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/cannot delete the default profile/i)
  })
})
