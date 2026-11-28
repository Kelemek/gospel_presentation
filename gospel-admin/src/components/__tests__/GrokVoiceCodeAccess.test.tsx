import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GrokVoiceCodeAccess } from '@/components/GrokVoiceCodeAccess'
import { GROK_VOICE_TOKEN_STORAGE_KEY, writeGrokVoiceToken } from '@/lib/grokVoiceTokenStorage'
import { DEVICE_LISTEN_VOICE_ID, readResourceListenVoice } from '@/lib/resourceListenVoiceStorage'

function getAlertModalMocks() {
  return (globalThis as unknown as { __alertModalMocks: { showConfirm: jest.Mock; showAlert: jest.Mock } })
    .__alertModalMocks
}

describe('GrokVoiceCodeAccess', () => {
  const token = `gvt_${'c'.repeat(43)}`

  beforeEach(() => {
    localStorage.clear()
    const { showConfirm, showAlert } = getAlertModalMocks()
    showConfirm.mockReset()
    showConfirm.mockResolvedValue(false)
    showAlert.mockReset()
  })

  it('confirms before clearing Grok voice and cancels without removing the token', async () => {
    writeGrokVoiceToken(token)
    const onChanged = jest.fn()
    const showConfirm = getAlertModalMocks().showConfirm

    render(<GrokVoiceCodeAccess onChanged={onChanged} />)
    fireEvent.click(screen.getByRole('button', { name: /remove grok voice from this device/i }))

    await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1))
    expect(showConfirm).toHaveBeenCalledWith(
      expect.stringMatching(/new access code/i),
      expect.objectContaining({ confirmLabel: 'Remove', destructive: true })
    )
    expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBe(token)
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('removes the token after confirm', async () => {
    writeGrokVoiceToken(token)
    const onChanged = jest.fn()
    getAlertModalMocks().showConfirm.mockResolvedValue(true)

    render(<GrokVoiceCodeAccess onChanged={onChanged} />)
    fireEvent.click(screen.getByRole('button', { name: /remove grok voice from this device/i }))

    await waitFor(() => expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBeNull())
    expect(readResourceListenVoice()).toBe(DEVICE_LISTEN_VOICE_ID)
    expect(onChanged).toHaveBeenCalled()
  })
})