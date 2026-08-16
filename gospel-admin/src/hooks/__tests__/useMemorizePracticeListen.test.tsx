/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import type { GospelSection } from '@/lib/types'
import { useMemorizePracticeListen } from '@/hooks/useMemorizePracticeListen'
import { resetGospelListenSpeechEngineForTests } from '@/lib/gospelListenSpeechEngine'
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

function mountListen(listenViaEsvPassageUrl = false) {
  return renderHook(() =>
    useMemorizePracticeListen({
      verse,
      verseId: verse.id,
      listenViaEsvPassageUrl,
      memorizePassageAudioUrl: '/api/scripture/audio?reference=John%203%3A16&translation=niv',
      listenInteractionAllowed: true,
      shouldStopListen: false,
    })
  )
}

describe('useMemorizePracticeListen', () => {
  beforeEach(() => {
    resetGospelListenSpeechEngineForTests()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        speaking: false,
        paused: false,
      },
    })
  })

  afterEach(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('uses device TTS labels when not on ESV passage audio', () => {
    const { result } = mountListen(false)
    expect(result.current.listenButtonLabel).toBe('Listen')
    expect(result.current.readAloudDialogPrimaryLabel).toBe('Play')
  })

  it('starts TTS through the shared engine on primary click', () => {
    const speak = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: jest.fn(), pause: jest.fn(), resume: jest.fn(), speaking: false, paused: false },
    })

    const { result } = mountListen(false)
    act(() => {
      result.current.handleListenPassageClick()
    })
    expect(speak).toHaveBeenCalled()
  })

  it('stops playback when shouldStopListen becomes true', () => {
    const cancel = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: jest.fn(), cancel, pause: jest.fn(), resume: jest.fn(), speaking: true, paused: false },
    })

    const { rerender } = renderHook(
      ({ shouldStopListen }) =>
        useMemorizePracticeListen({
          verse,
          verseId: verse.id,
          listenViaEsvPassageUrl: false,
          memorizePassageAudioUrl: '/api/scripture/audio',
          listenInteractionAllowed: true,
          shouldStopListen,
        }),
      { initialProps: { shouldStopListen: false } }
    )

    rerender({ shouldStopListen: true })
    expect(cancel).toHaveBeenCalled()
  })
})
