jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

import * as server from '@/lib/supabase/server'
import { grantProfileAccess, getProfileAccessList } from '@/lib/supabase-data-service'

describe('supabase-data-service helpers (unit)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('grantProfileAccess returns early when no valid emails', async () => {
    // Make createClient return an object with from/upsert spy
    const upsertMock = jest.fn()
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: () => ({ upsert: upsertMock })
    })

    await grantProfileAccess('p1', ['   ', 'invalid-email'], 'g')

    // upsert should not have been called because no valid emails
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('getProfileAccessList returns empty array on error', async () => {
    // createClient returns supabase where from...order throws
    const orderMock = jest.fn(async () => { throw new Error('db fail') })
    const eqMock = jest.fn(() => ({ order: orderMock }))
    const selectMock = jest.fn(() => ({ eq: eqMock }))

    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: () => ({ select: selectMock })
    })

    const list = await getProfileAccessList('p1')
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(0)
  })
})
