import { renderHook, waitFor } from '@testing-library/react'
import { useGrokVoiceEnabled } from '@/hooks/useGrokVoiceEnabled'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('useGrokVoiceEnabled', () => {
  beforeEach(() => {
    jest.mocked(createClient).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
  })

  it('returns false before hydration', () => {
    const { result } = renderHook(() => useGrokVoiceEnabled(false))
    expect(result.current).toBe(false)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns true only when the account flag is on', async () => {
    jest.mocked(createClient).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { grok_voice_enabled: true } }),
          }),
        }),
      }),
    } as never)

    const { result } = renderHook(() => useGrokVoiceEnabled(true))
    await waitFor(() => expect(result.current).toBe(true))
  })
})
