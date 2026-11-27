/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  GROK_VOICE_PREVIEW_TEXT,
  ResourceListenGrokVoicePicker,
} from '@/components/ResourceListenGrokVoicePicker'
import type { GrokVoice } from '@/lib/grokTtsVoices'

const voices: GrokVoice[] = [
  { voiceId: 'eve', name: 'Eve', gender: 'female' },
  { voiceId: 'leo', name: 'Leo', gender: 'male' },
]

class FakeAudio {
  static all: FakeAudio[] = []
  paused = false
  onended: (() => void) | null = null
  pause = jest.fn(() => {
    this.paused = true
  })
  play = jest.fn().mockResolvedValue(undefined)

  constructor(public src: string) {
    FakeAudio.all.push(this)
  }
}

function renderPicker(onChange = jest.fn()) {
  render(<ResourceListenGrokVoicePicker voices={voices} value="device" onChange={onChange} />)
  fireEvent.click(screen.getByTestId('resource-listen-voice'))
  return onChange
}

describe('ResourceListenGrokVoicePicker', () => {
  const originalFetch = global.fetch
  const originalAudio = global.Audio
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    FakeAudio.all = []
    global.Audio = FakeAudio as unknown as typeof Audio
    URL.createObjectURL = jest.fn(() => 'blob:preview') as typeof URL.createObjectURL
    URL.revokeObjectURL = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    }) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.Audio = originalAudio
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  })

  it('keeps This device separate and groups the other voices', () => {
    const onChange = renderPicker()
    expect(screen.getByTestId('resource-listen-voice-option-device')).toHaveTextContent('This device')
    const female = screen.getByText('Female')
    const male = screen.getByText('Male')
    expect(female.compareDocumentPosition(screen.getByTestId('resource-listen-voice-option-eve'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(male.compareDocumentPosition(screen.getByTestId('resource-listen-voice-option-leo'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    fireEvent.click(screen.getByTestId('resource-listen-voice-option-leo'))
    expect(onChange).toHaveBeenCalledWith('leo')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('previews a voice without selecting it, and stops the previous preview', async () => {
    const onChange = renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    await waitFor(() => expect(FakeAudio.all).toHaveLength(1))
    expect(onChange).not.toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/read-aloud/tts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: GROK_VOICE_PREVIEW_TEXT,
          voiceId: 'eve',
          withTimestamps: false,
        }),
      })
    )
    expect(FakeAudio.all[0]!.play).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-leo'))
    await waitFor(() => expect(FakeAudio.all).toHaveLength(2))
    expect(FakeAudio.all[0]!.pause).toHaveBeenCalled()
    expect(FakeAudio.all[1]!.src).toBe('blob:preview')
  })

  it('shows a short note when the preview request is rate limited', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'busy' }),
    }) as typeof fetch
    renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    expect(await screen.findByTestId('resource-listen-voice-preview-error')).toHaveTextContent(
      'Preview is busy. Try again in a moment.'
    )
    expect(FakeAudio.all).toHaveLength(0)
  })

  it('shows a short note when the preview service fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'upstream' }),
    }) as typeof fetch
    renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    expect(await screen.findByTestId('resource-listen-voice-preview-error')).toHaveTextContent(
      'Could not play that preview.'
    )
    expect(FakeAudio.all).toHaveLength(0)
  })

  it('shows a short note when the preview request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'missing' }),
    }) as typeof fetch
    renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    expect(await screen.findByTestId('resource-listen-voice-preview-error')).toHaveTextContent(
      'Grok voice is not available right now.'
    )
    expect(FakeAudio.all).toHaveLength(0)
  })

  it('stops a preview when the menu closes', async () => {
    const { unmount } = render(
      <ResourceListenGrokVoicePicker voices={voices} value="device" onChange={jest.fn()} />
    )
    fireEvent.click(screen.getByTestId('resource-listen-voice'))
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    await waitFor(() => expect(FakeAudio.all).toHaveLength(1))
    unmount()
    expect(FakeAudio.all[0]!.pause).toHaveBeenCalled()
  })
})
