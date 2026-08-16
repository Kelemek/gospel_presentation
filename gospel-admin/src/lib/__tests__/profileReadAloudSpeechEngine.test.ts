/**
 * @jest-environment jsdom
 */

import { waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
import {
  cancelProfileReadAloudSpeech,
  GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT,
  getProfileReadAloudSpeechEngine,
  isProfileReadAloudSpeechAvailable,
  nativeReadAloudResumeOffset,
  resetProfileReadAloudSpeechEngineForTests,
  shouldUseNativeAndroidReadAloudSpeech,
} from '@/lib/profileReadAloudSpeechEngine'

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
    isPluginAvailable: jest.fn(() => false),
  },
}))

type ListenerMap = {
  start?: (event: { utteranceId: string }) => void
  end?: (event: { utteranceId: string }) => void
  boundary?: (event: { utteranceId: string; charIndex: number; charLength?: number }) => void
  error?: (event: { utteranceId: string; error: string }) => void
}

const listeners: ListenerMap = {}

function mockNativeAndroidPlugin(available = true) {
  ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
  ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')
  ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(available)
}

describe('profileReadAloudSpeechEngine', () => {
  const originalUserAgent = navigator.userAgent

  beforeEach(() => {
    resetProfileReadAloudSpeechEngineForTests()
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('web')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(false)
    Object.keys(listeners).forEach((k) => {
      delete listeners[k as keyof ListenerMap]
    })
    ;(SpeechSynthesis.addListener as jest.Mock).mockImplementation(
      async (event: keyof ListenerMap, fn: ListenerMap[keyof ListenerMap]) => {
        listeners[event] = fn
        return { remove: jest.fn() }
      }
    )
    ;(SpeechSynthesis.speak as jest.Mock).mockImplementation(async () => ({ utteranceId: 'utt-1' }))
    ;(SpeechSynthesis.cancel as jest.Mock).mockResolvedValue(undefined)
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('uses Web Speech when not native Android', () => {
    expect(shouldUseNativeAndroidReadAloudSpeech()).toBe(false)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: jest.fn(), cancel: jest.fn(), speaking: false, paused: false },
    })
    expect(isProfileReadAloudSpeechAvailable()).toBe(true)
  })

  it('speaks via SpeechSynthesisUtterance on web', () => {
    const speak = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: jest.fn(), speaking: false, paused: false },
    })
    const onstart = jest.fn()
    getProfileReadAloudSpeechEngine().speak('Hello verse 16', 1, { onstart })
    expect(speak).toHaveBeenCalledTimes(1)
    const utt = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utt.text).toBe('Hello verse 16')
    expect(utt.lang).toBe('en-US')
    utt.onstart?.(new Event('start') as SpeechSynthesisEvent)
    expect(onstart).toHaveBeenCalled()
  })

  it('forwards Web Speech boundary charIndex', () => {
    const speak = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: jest.fn(), speaking: false, paused: false },
    })
    const onboundary = jest.fn()
    getProfileReadAloudSpeechEngine().speak('Hello world', 1, { onboundary })
    const utt = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    utt.onboundary?.({ charIndex: 6, charLength: 5 } as SpeechSynthesisEvent)
    expect(onboundary).toHaveBeenCalledWith({ charIndex: 6, charLength: 5 })
  })

  it('is true for native Android when the speech plugin is available', () => {
    mockNativeAndroidPlugin(true)
    expect(shouldUseNativeAndroidReadAloudSpeech()).toBe(true)
    expect(isProfileReadAloudSpeechAvailable()).toBe(true)
  })

  it('is false for native Android without the speech plugin and without Web Speech', () => {
    mockNativeAndroidPlugin(false)
    expect(shouldUseNativeAndroidReadAloudSpeech()).toBe(false)
    expect(isProfileReadAloudSpeechAvailable()).toBe(false)
  })

  it('is false for native Android without the plugin even when speechSynthesis exists', () => {
    mockNativeAndroidPlugin(false)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: jest.fn(), cancel: jest.fn(), speaking: false, paused: false },
    })
    expect(isProfileReadAloudSpeechAvailable()).toBe(false)
  })

  it('speaks through the Capgo plugin on native Android and maps boundary events', async () => {
    mockNativeAndroidPlugin(true)
    const onstart = jest.fn()
    const onend = jest.fn()
    const onboundary = jest.fn()
    getProfileReadAloudSpeechEngine().speak('Hello world', 1.25, { onstart, onend, onboundary })

    await waitFor(() => {
      expect(SpeechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello world',
          language: 'en-US',
          rate: 1.25,
          queueStrategy: 'Flush',
        })
      )
    })

    listeners.start?.({ utteranceId: 'utt-1' })
    expect(onstart).toHaveBeenCalled()
    listeners.boundary?.({ utteranceId: 'utt-1', charIndex: 6, charLength: 5 })
    expect(onboundary).toHaveBeenCalledWith({ charIndex: 6, charLength: 5 })
    listeners.end?.({ utteranceId: 'utt-1' })
    expect(onend).toHaveBeenCalled()
    expect(getProfileReadAloudSpeechEngine().isSpeaking()).toBe(false)
  })

  it('snaps native resume offset to the current word start', () => {
    expect(nativeReadAloudResumeOffset('Hello world', 0)).toBe(0)
    expect(nativeReadAloudResumeOffset('Hello world', 3)).toBe(0)
    expect(nativeReadAloudResumeOffset('Hello world', 6)).toBe(6)
    expect(nativeReadAloudResumeOffset('Hello world', 8)).toBe(6)
    expect(nativeReadAloudResumeOffset('Hello  world', 6)).toBe(7)
  })

  it('pause on native Android stops audio and resume continues from the current word', async () => {
    mockNativeAndroidPlugin(true)
    let speakCount = 0
    ;(SpeechSynthesis.speak as jest.Mock).mockImplementation(async () => {
      speakCount += 1
      return { utteranceId: `utt-${speakCount}` }
    })
    const handlers = { onstart: jest.fn(), onend: jest.fn(), onboundary: jest.fn() }
    const engine = getProfileReadAloudSpeechEngine()
    engine.speak('Hello world again', 1, handlers)
    await waitFor(() => expect(SpeechSynthesis.speak).toHaveBeenCalledTimes(1))
    listeners.start?.({ utteranceId: 'utt-1' })
    listeners.boundary?.({ utteranceId: 'utt-1', charIndex: 6, charLength: 5 })

    engine.pause()
    expect(engine.isPaused()).toBe(true)
    expect(engine.isSpeaking()).toBe(true)
    expect(SpeechSynthesis.cancel).toHaveBeenCalled()

    engine.resume()
    await waitFor(() =>
      expect(SpeechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'world again' })
      )
    )
    expect(engine.isPaused()).toBe(false)
    expect(handlers.onstart).toHaveBeenCalledTimes(1)

    listeners.start?.({ utteranceId: 'utt-2' })
    expect(handlers.onstart).toHaveBeenCalledTimes(1)
    listeners.boundary?.({ utteranceId: 'utt-2', charIndex: 0, charLength: 5 })
    expect(handlers.onboundary).toHaveBeenLastCalledWith({ charIndex: 6, charLength: 5 })
    listeners.end?.({ utteranceId: 'utt-2' })
    expect(handlers.onend).toHaveBeenCalledTimes(1)
  })

  it('cancelProfileReadAloudSpeech stops native TTS', async () => {
    mockNativeAndroidPlugin(true)
    getProfileReadAloudSpeechEngine().speak('Hi', 1, {})
    await Promise.resolve()
    const onCancelled = jest.fn()
    window.addEventListener(GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT, onCancelled)
    cancelProfileReadAloudSpeech()
    expect(onCancelled).toHaveBeenCalled()
    window.removeEventListener(GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT, onCancelled)
    expect(SpeechSynthesis.cancel).toHaveBeenCalled()
    expect(getProfileReadAloudSpeechEngine().isSpeaking()).toBe(false)
  })

  it('does not treat a cancelled utterance end as the new chunk finishing', async () => {
    mockNativeAndroidPlugin(true)
    let speakCount = 0
    ;(SpeechSynthesis.speak as jest.Mock).mockImplementation(async () => {
      speakCount += 1
      return { utteranceId: `utt-${speakCount}` }
    })
    const firstEnd = jest.fn()
    const secondEnd = jest.fn()
    const engine = getProfileReadAloudSpeechEngine()
    engine.speak('First chunk.', 1, { onend: firstEnd })
    await waitFor(() => expect(SpeechSynthesis.speak).toHaveBeenCalledTimes(1))

    engine.cancel()
    engine.speak('Second chunk.', 1, { onend: secondEnd })
    await waitFor(() => expect(SpeechSynthesis.speak).toHaveBeenCalledTimes(2))

    listeners.end?.({ utteranceId: 'utt-1' })
    expect(firstEnd).not.toHaveBeenCalled()
    expect(secondEnd).not.toHaveBeenCalled()
    expect(engine.isSpeaking()).toBe(true)

    listeners.end?.({ utteranceId: 'utt-2' })
    expect(secondEnd).toHaveBeenCalledTimes(1)
    expect(engine.isSpeaking()).toBe(false)
  })

  it('retries native listener setup after a failed registration', async () => {
    mockNativeAndroidPlugin(true)
    const removed = jest.fn().mockResolvedValue(undefined)
    let addCalls = 0
    ;(SpeechSynthesis.addListener as jest.Mock).mockImplementation(
      async (event: keyof ListenerMap, fn: ListenerMap[keyof ListenerMap]) => {
        addCalls += 1
        if (addCalls === 2) throw new Error('addListener failed')
        listeners[event] = fn
        return { remove: removed }
      }
    )
    const firstError = jest.fn()
    getProfileReadAloudSpeechEngine().speak('Hello', 1, { onerror: firstError })
    await waitFor(() => expect(firstError).toHaveBeenCalled())
    expect(SpeechSynthesis.speak).not.toHaveBeenCalled()
    expect(removed).toHaveBeenCalled()

    Object.keys(listeners).forEach((k) => {
      delete listeners[k as keyof ListenerMap]
    })
    ;(SpeechSynthesis.addListener as jest.Mock).mockImplementation(
      async (event: keyof ListenerMap, fn: ListenerMap[keyof ListenerMap]) => {
        listeners[event] = fn
        return { remove: jest.fn() }
      }
    )
    const onend = jest.fn()
    getProfileReadAloudSpeechEngine().speak('Hello', 1, { onend })
    await waitFor(() => expect(SpeechSynthesis.speak).toHaveBeenCalled())
    listeners.end?.({ utteranceId: 'utt-1' })
    expect(onend).toHaveBeenCalled()
  })
})
