/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  GROK_VOICE_PREVIEW_TEXT,
  ResourceListenGrokVoicePicker,
} from '@/components/ResourceListenGrokVoicePicker'
import { resetGospelListenSpeechEngineForTests } from '@/lib/gospelListenSpeechEngine'
import type { GrokVoice } from '@/lib/grokTtsVoices'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import { toMemorizeWebSpeechUtteranceRate } from '@/lib/memorizeListenSpeedStorage'

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

function mockDeviceSpeech() {
  const speak = jest.fn()
  const cancel = jest.fn()
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak,
      cancel,
      pause: jest.fn(),
      resume: jest.fn(),
      speaking: false,
      paused: false,
    },
  })
  resetGospelListenSpeechEngineForTests()
  return { speak, cancel }
}

function clearDeviceSpeech() {
  delete (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  resetGospelListenSpeechEngineForTests()
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

  it('previews This device with local speech and does not select it', async () => {
    const { speak, cancel } = mockDeviceSpeech()
    const onChange = renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-device'))
    expect(onChange).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(speak).toHaveBeenCalledTimes(1)
    const utterance = speak.mock.calls[0]![0] as SpeechSynthesisUtterance
    expect(utterance.text).toBe(GROK_VOICE_PREVIEW_TEXT)
    expect(utterance.rate).toBe(toMemorizeWebSpeechUtteranceRate(1, isMemorizeIosWebHost()))

    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    expect(cancel).toHaveBeenCalled()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(onChange).not.toHaveBeenCalled()
    clearDeviceSpeech()
  })

  it('stops a Grok preview when This device starts', async () => {
    const { speak } = mockDeviceSpeech()
    renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-eve'))
    await waitFor(() => expect(FakeAudio.all).toHaveLength(1))
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-device'))
    expect(FakeAudio.all[0]!.pause).toHaveBeenCalled()
    expect(speak).toHaveBeenCalledTimes(1)
    expect((speak.mock.calls[0]![0] as SpeechSynthesisUtterance).text).toBe(GROK_VOICE_PREVIEW_TEXT)
    clearDeviceSpeech()
  })

  it('shows a short note when this device cannot speak', () => {
    clearDeviceSpeech()
    const onChange = renderPicker()
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-device'))
    expect(screen.getByTestId('resource-listen-voice-preview-error')).toHaveTextContent(
      'This device cannot play a preview right now.'
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('stops a device preview when the menu closes', () => {
    const { cancel } = mockDeviceSpeech()
    const { unmount } = render(
      <ResourceListenGrokVoicePicker voices={voices} value="device" onChange={jest.fn()} />
    )
    fireEvent.click(screen.getByTestId('resource-listen-voice'))
    fireEvent.click(screen.getByTestId('resource-listen-voice-preview-device'))
    unmount()
    expect(cancel).toHaveBeenCalled()
    clearDeviceSpeech()
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
