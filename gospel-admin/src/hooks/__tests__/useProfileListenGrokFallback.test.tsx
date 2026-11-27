/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import type { MutableRefObject } from 'react'
import type { GospelSection } from '@/lib/types'
import { useProfileListenChunkQueue } from '@/hooks/useProfileListenChunkQueue'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'
import { useListenEnginePlayPause } from '@/hooks/useListenEnginePlayPause'
import { GROK_LISTEN_FALLBACK_NOTE } from '@/lib/grokListenFallback'
import { resetGrokResourceListenPlayerForTests } from '@/lib/grokResourceListenPlayer'
import { resetGospelListenSpeechEngineForTests } from '@/lib/gospelListenSpeechEngine'

const sections: GospelSection[] = [
  {
    section: '1',
    title: 'Intro',
    subsections: [{ title: 'Part A', content: 'Alpha sentence.' }],
  },
]

describe('profile listen Grok fallback', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    document.body.innerHTML = '<div id="section-1-0"><p>Alpha sentence.</p></div>'
    resetGospelListenSpeechEngineForTests()
    resetGrokResourceListenPlayerForTests()
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
    global.fetch = originalFetch
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('speaks with the device voice and shows a note when Grok speech fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'Grok voice failed.' }),
    }) as typeof fetch
    const onGrokFallback = jest.fn()
    const voiceRef = { current: 'eve' } as MutableRefObject<string>
    const fallbackRef = { current: false } as MutableRefObject<boolean>

    const { result } = renderHook(() => {
      const readAlong = useProfileReadAlongSession({ profileSlug: 'p1' })
      const listenPlaybackRateRef = { current: 1 as const }
      const playPause = useListenEnginePlayPause({
        listenPlaybackRateRef,
        exclusiveOwner: 'profile-resource-read-aloud',
        idleLabel: 'Play',
        activeLabel: 'Pause',
      })
      const chunkQueue = useProfileListenChunkQueue({
        sections,
        readAlong,
        listenPlaybackRateRef,
        rateAtStartRef: playPause.rateAtStartRef,
        prepareUtteranceStart: playPause.prepareUtteranceStart,
        markUtteranceStarted: playPause.markUtteranceStarted,
        resetPlaybackState: playPause.resetPlaybackState,
        resourceListenVoiceRef: voiceRef,
        grokFallbackRef: fallbackRef,
        onGrokFallback,
      })
      return chunkQueue
    })

    const scope = document.getElementById('section-1-0')!
    act(() => {
      result.current.beginChunkPlayback({
        scope,
        anchorId: 'section-1-0',
        fingerprint: 'fp',
        textLength: 15,
        chunkMeta: [{ text: 'Alpha sentence.', plainStart: 0 }],
        startChunk: 0,
        startPlainOffset: 0,
      })
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onGrokFallback).toHaveBeenCalledWith(GROK_LISTEN_FALLBACK_NOTE)
    expect(fallbackRef.current).toBe(true)
    expect(window.speechSynthesis.speak).toHaveBeenCalled()
    const utterance = (window.speechSynthesis.speak as jest.Mock).mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utterance.text).toContain('Alpha')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/read-aloud/tts',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"voiceId":"eve"'),
      })
    )
  })
})
