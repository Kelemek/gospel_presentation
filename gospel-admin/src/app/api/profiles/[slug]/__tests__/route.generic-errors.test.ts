import { jest } from '@jest/globals'

describe('profiles/[slug] route generic error branches', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('PUT returns 500 when updateProfile throws non-Error', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      updateProfile: () => { throw 'boom' }
    }))

    const mod = await import('../route')
    const { PUT } = mod

    const req: any = { json: async () => ({ title: 'New' }) }
    const res = await PUT(req, { params: Promise.resolve({ slug: 'missing' }) } as any)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed to update profile/i)
  })

  it('DELETE returns 500 when deleteProfile throws non-Error', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      deleteProfile: () => { throw 'boom' }
    }))

    const mod = await import('../route')
    const { DELETE } = mod

    const res = await DELETE({} as any, { params: Promise.resolve({ slug: 'missing' }) } as any)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed to delete profile/i)
  })
})
