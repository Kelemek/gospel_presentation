/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useListenEnginePlayPause } from '@/hooks/useListenEnginePlayPause'
import { resetGospelListenSpeechEngineForTests } from '@/lib/gospelListenSpeechEngine'

describe('useListenEnginePlayPause', () => {
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

  it('returns idle label when speech is not active', () => {
    const { result } = renderHook(() =>
      useListenEnginePlayPause({
        listenPlaybackRateRef: { current: 1 },
        exclusiveOwner: 'memorize-practice',
        idleLabel: 'Listen',
        activeLabel: 'Pause',
      })
    )
    expect(result.current.buttonLabel).toBe('Listen')
    expect(result.current.ariaPressed).toBe(false)
  })

  it('pauses active speech and flushes via onPause', () => {
    const onPause = jest.fn()
    const pauseSpy = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: pauseSpy,
        resume: jest.fn(),
        speaking: true,
        paused: false,
      },
    })

    const { result } = renderHook(() =>
      useListenEnginePlayPause({
        listenPlaybackRateRef: { current: 1 },
        exclusiveOwner: 'profile-resource-read-aloud',
        idleLabel: 'Play',
        activeLabel: 'Pause',
      })
    )

    act(() => {
      result.current.handleSpeakingEngineClick({
        restartCurrentUtterance: jest.fn(),
        onPause,
      })
    })

    expect(pauseSpy).toHaveBeenCalled()
    expect(onPause).toHaveBeenCalled()
    expect(result.current.buttonLabel).toBe('Play')
    expect(result.current.ariaPressed).toBe(false)
  })
})
