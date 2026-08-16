/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import type { GospelSection } from '@/lib/types'
import { useProfileListenChunkQueue } from '@/hooks/useProfileListenChunkQueue'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'
import { useListenEnginePlayPause } from '@/hooks/useListenEnginePlayPause'
import {
  getGospelListenSpeechEngine,
  resetGospelListenSpeechEngineForTests,
} from '@/lib/gospelListenSpeechEngine'

const sections: GospelSection[] = [
  {
    section: '1',
    title: 'Intro',
    subsections: [
      { title: 'Part A', content: 'Alpha sentence.' },
      { title: 'Part B', content: 'Beta sentence.' },
    ],
  },
]

function mountTwoBlockDom() {
  document.body.innerHTML = `
    <section id="section-1" class="scroll-mt-20">
      <div id="section-1-0" class="scroll-mt-20"><p>Alpha sentence.</p></div>
      <div id="section-1-1" class="scroll-mt-20"><p>Beta sentence.</p></div>
    </section>
  `
  for (const [id, top] of [
    ['section-1', 0],
    ['section-1-0', 0],
    ['section-1-1', 400],
  ] as const) {
    const el = document.getElementById(id)
    if (!el) continue
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top,
      left: 0,
      right: 100,
      bottom: top + 50,
      width: 100,
      height: 50,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect)
  }
  Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView
}

function mountChunkQueue() {
  const listenPlaybackRateRef = { current: 1 as const }
  return renderHook(() => {
    const readAlong = useProfileReadAlongSession({ profileSlug: 'p1' })
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
    })
    return { readAlong, chunkQueue }
  })
}

describe('useProfileListenChunkQueue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
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

  it('beginChunkPlayback speaks the first chunk for a scope', () => {
    mountTwoBlockDom()
    const scope = document.getElementById('section-1-0')!
    const speak = window.speechSynthesis.speak as jest.Mock
    const { result } = mountChunkQueue()

    act(() => {
      result.current.chunkQueue.beginChunkPlayback({
        scope,
        anchorId: 'section-1-0',
        fingerprint: '20:abc',
        textLength: scope.textContent?.length ?? 0,
        chunkMeta: [{ text: 'Alpha sentence.', plainStart: 0 }],
        startChunk: 0,
        startPlainOffset: 0,
      })
    })

    expect(speak).toHaveBeenCalled()
    expect(result.current.chunkQueue.ttsActiveRef.current).toBe(true)
    expect(result.current.readAlong.readAlongAnchorIdRef.current).toBe('section-1-0')
  })

  it('stopActiveSession clears active playback state', () => {
    mountTwoBlockDom()
    const scope = document.getElementById('section-1-0')!
    const { result } = mountChunkQueue()

    act(() => {
      result.current.chunkQueue.beginChunkPlayback({
        scope,
        anchorId: 'section-1-0',
        fingerprint: '20:abc',
        textLength: scope.textContent?.length ?? 0,
        chunkMeta: [{ text: 'Alpha sentence.', plainStart: 0 }],
        startChunk: 0,
        startPlainOffset: 0,
      })
      result.current.chunkQueue.stopActiveSession()
    })

    expect(result.current.chunkQueue.ttsActiveRef.current).toBe(false)
    expect(result.current.chunkQueue.ttsChunkIndexRef.current).toBe(0)
  })

  it('advances to the next TOC block after the chunk queue finishes', async () => {
    jest.useFakeTimers()
    mountTwoBlockDom()
    const firstScope = document.getElementById('section-1-0')!
    const spoken: string[] = []
    const speak = jest.fn((utt: SpeechSynthesisUtterance) => {
      spoken.push(utt.text)
      queueMicrotask(() => utt.onstart?.(new Event('start') as SpeechSynthesisEvent))
      queueMicrotask(() => utt.onend?.(new Event('end') as SpeechSynthesisEvent))
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak,
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        get speaking() {
          return false
        },
        get paused() {
          return false
        },
      },
    })

    const { result } = mountChunkQueue()

    act(() => {
      result.current.chunkQueue.beginChunkPlayback({
        scope: firstScope,
        anchorId: 'section-1-0',
        fingerprint: '15:abc',
        textLength: firstScope.textContent?.length ?? 0,
        chunkMeta: [{ text: 'Alpha sentence.', plainStart: 0 }],
        startChunk: 0,
        startPlainOffset: 0,
      })
    })

    await act(async () => {
      await Promise.resolve()
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })

    expect(spoken.some((text) => text.includes('Alpha'))).toBe(true)
    expect(spoken.some((text) => text.includes('Beta'))).toBe(true)
    expect(getGospelListenSpeechEngine().isSpeaking()).toBe(false)
    jest.useRealTimers()
  })

  it('clearChunkQueue resets read-along session bindings', () => {
    mountTwoBlockDom()
    const scope = document.getElementById('section-1-0')!
    const { result } = mountChunkQueue()

    act(() => {
      result.current.chunkQueue.beginChunkPlayback({
        scope,
        anchorId: 'section-1-0',
        fingerprint: '20:abc',
        textLength: scope.textContent?.length ?? 0,
        chunkMeta: [{ text: 'Alpha sentence.', plainStart: 0 }],
        startChunk: 0,
        startPlainOffset: 0,
      })
      result.current.chunkQueue.clearChunkQueue()
    })

    expect(result.current.readAlong.readAlongAnchorIdRef.current).toBeNull()
    expect(result.current.readAlong.readAlongScopeRef.current).toBeNull()
  })
})
