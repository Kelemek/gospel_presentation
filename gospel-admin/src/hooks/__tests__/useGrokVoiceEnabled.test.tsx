import { renderHook, waitFor } from '@testing-library/react'
import { useGrokVoiceEnabled } from '@/hooks/useGrokVoiceEnabled'
import { GROK_VOICE_TOKEN_STORAGE_KEY } from '@/lib/grokVoiceTokenStorage'

const TOKEN = `gvt_${'a'.repeat(43)}`

function accessResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    clone() {
      return this
    },
    json: async () => body,
  }
}

describe('useGrokVoiceEnabled', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    localStorage.clear()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('stays off before hydration and does not ask the server', () => {
    localStorage.setItem(GROK_VOICE_TOKEN_STORAGE_KEY, TOKEN)
    const { result } = renderHook(() => useGrokVoiceEnabled(false))
    expect(result.current.enabled).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('stays off without a saved token and does not ask the server', () => {
    const { result } = renderHook(() => useGrokVoiceEnabled(true))
    expect(result.current.enabled).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('turns on when this device token is accepted', async () => {
    localStorage.setItem(GROK_VOICE_TOKEN_STORAGE_KEY, TOKEN)
    global.fetch = jest.fn().mockResolvedValue(accessResponse(200, { enabled: true }))
    const { result } = renderHook(() => useGrokVoiceEnabled(true))
    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/read-aloud/access',
      expect.objectContaining({
        headers: { 'X-Grok-Voice-Token': TOKEN },
      })
    )
    expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBe(TOKEN)
  })

  it('clears the token only when the server says it is invalid', async () => {
    localStorage.setItem(GROK_VOICE_TOKEN_STORAGE_KEY, TOKEN)
    global.fetch = jest.fn().mockResolvedValue(
      accessResponse(401, { enabled: false, code: 'grok_token_invalid' })
    )
    const { result } = renderHook(() => useGrokVoiceEnabled(true))
    await waitFor(() => expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBeNull())
    expect(result.current.enabled).toBe(false)
  })
})
