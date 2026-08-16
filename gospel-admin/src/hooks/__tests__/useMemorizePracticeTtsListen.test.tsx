/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { claimExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import {
  getGospelListenSpeechEngine,
  resetGospelListenSpeechEngineForTests,
} from '@/lib/gospelListenSpeechEngine'
import { useMemorizePracticeTtsListen } from '@/hooks/useMemorizePracticeTtsListen'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

const verse: MemorizedVerse = {
  id: 'v1',
  reference: 'John 3:16',
  text: 'For God so loved the world',
  translation: 'niv',
  dateAdded: Date.now(),
  lastPracticedAt: null,
  practiceSessions: [],
}

function mountHook() {
  const clearListenRepeatGapTimer = jest.fn()
  const repeatListenOnRef = { current: false }
  const listenPlaybackRateRef = { current: 1 as const }
  const listenRepeatGapTimerRef = { current: null as ReturnType<typeof setTimeout> | null }

  const { result } = renderHook(() =>
    useMemorizePracticeTtsListen({
      verse,
      clearListenRepeatGapTimer,
      listenRepeatGapTimerRef,
      repeatListenOnRef,
      listenPlaybackRateRef,
    })
  )

  return {
    result,
    clearListenRepeatGapTimer,
    repeatListenOnRef,
    listenPlaybackRateRef,
  }
}

describe('useMemorizePracticeTtsListen', () => {
  beforeEach(() => {
    resetGospelListenSpeechEngineForTests()
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('speaks through the shared read-aloud engine', () => {
    const speak = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: jest.fn(), pause: jest.fn(), resume: jest.fn(), speaking: false, paused: false },
    })

    const { result } = mountHook()
    act(() => {
      result.current.handleTtsListenClick()
    })

    expect(speak).toHaveBeenCalledTimes(1)
    const utterance = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utterance.text).toContain('For God so loved the world')
  })

  it('stopTts cancels the engine', () => {
    const cancel = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: jest.fn(), cancel, pause: jest.fn(), resume: jest.fn(), speaking: true, paused: false },
    })

    const { result } = mountHook()
    act(() => {
      result.current.stopTts()
    })
    expect(cancel).toHaveBeenCalled()
  })

  it('stops when another owner claims exclusive listen', () => {
    const speak = jest.fn()
    const cancel = jest.fn()
    let speaking = false
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (utt: SpeechSynthesisUtterance) => {
          speaking = true
          speak(utt)
          queueMicrotask(() => utt.onstart?.(new Event('start') as SpeechSynthesisEvent))
        },
        cancel: () => {
          speaking = false
          cancel()
        },
        pause: jest.fn(),
        resume: jest.fn(),
        get speaking() {
          return speaking
        },
        get paused() {
          return false
        },
      },
    })

    const { result } = mountHook()
    act(() => {
      result.current.handleTtsListenClick()
    })
    expect(speak).toHaveBeenCalled()

    act(() => {
      claimExclusiveListenOwner('profile-resource-read-aloud')
    })
    expect(cancel).toHaveBeenCalled()
    expect(getGospelListenSpeechEngine().isSpeaking()).toBe(false)
  })
})
