import { renderHook, waitFor } from '@testing-library/react'
import { useProfileCanEdit } from '@/hooks/useProfileCanEdit'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('useProfileCanEdit', () => {
  beforeEach(() => {
    jest.mocked(createClient).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
  })

  it('returns false before hydration', () => {
    const { result } = renderHook(() => useProfileCanEdit(false))
    expect(result.current).toBe(false)
  })

  it('returns true for admin users after hydration', async () => {
    jest.mocked(createClient).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
          }),
        }),
      }),
    } as never)

    const { result } = renderHook(() => useProfileCanEdit(true))
    await waitFor(() => expect(result.current).toBe(true))
  })
})
