/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import type { GospelSection } from '@/lib/types'
import { useProfileListenSession } from '@/hooks/useProfileListenSession'
import {
  getGospelListenSpeechEngine,
  resetGospelListenSpeechEngineForTests,
} from '@/lib/gospelListenSpeechEngine'
import {
  readAlongTextFingerprint,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'

const sections: GospelSection[] = [
  {
    section: '1',
    title: 'Intro',
    subsections: [{ title: 'Part A', content: 'Body text for listen.' }],
  },
]

function mountSectionDom() {
  document.body.innerHTML = `
    <section id="section-1" class="scroll-mt-20">
      <div id="section-1-0" class="scroll-mt-20">
        <p>Paragraph for TTS.</p>
      </div>
    </section>
  `
  for (const id of ['section-1', 'section-1-0']) {
    const el = document.getElementById(id)
    if (!el) continue
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      right: 100,
      bottom: 50,
      width: 100,
      height: 50,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
  }
  Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView
}

function mountSession(onNothingToRead = jest.fn()) {
  const listenPlaybackRateRef = { current: 1 as const }
  return renderHook(() =>
    useProfileListenSession({
      sections,
      profileSlug: 'p1',
      onNothingToRead,
      listenPlaybackRateRef,
    })
  )
}

describe('useProfileListenSession', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    resetGospelListenSpeechEngineForTests()
    const speak = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak,
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

  it('shows Play when idle', () => {
    const { result } = mountSession()
    expect(result.current.listenButtonLabel).toBe('Play')
    expect(result.current.listenAriaPressed).toBe(false)
  })

  it('starts speech for the current TOC block on primary click', () => {
    mountSectionDom()
    const speak = window.speechSynthesis.speak as jest.Mock
    const { result } = mountSession()

    act(() => {
      result.current.handlePrimaryClick()
    })

    expect(speak).toHaveBeenCalled()
    const utterance = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utterance.text).toContain('Paragraph for TTS.')
  })

  it('stopFromExternalSource cancels the engine', () => {
    mountSectionDom()
    const cancel = window.speechSynthesis.cancel as jest.Mock
    const { result } = mountSession()

    act(() => {
      result.current.handlePrimaryClick()
    })
    act(() => {
      result.current.stopFromExternalSource()
    })

    expect(cancel).toHaveBeenCalled()
    expect(getGospelListenSpeechEngine().isSpeaking()).toBe(false)
  })

  it('reports unsupported listen via onNothingToRead', () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    resetGospelListenSpeechEngineForTests()
    const onNothingToRead = jest.fn()
    const { result } = mountSession(onNothingToRead)

    act(() => {
      result.current.handlePrimaryClick()
    })

    expect(onNothingToRead).toHaveBeenCalledWith('Listen is not supported in this browser.')
  })

  it('resumes from saved read-along progress for the current anchor', () => {
    mountSectionDom()
    const scope = document.getElementById('section-1-0')!
    const plainText = scope.textContent ?? ''
    const fingerprint = readAlongTextFingerprint(plainText)
    const resumeOffset = Math.min(10, Math.max(1, plainText.length - 2))
    saveProfileReadAlongProgress('p1', 'section-1-0', resumeOffset, fingerprint)

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

    const { result } = mountSession()
    act(() => {
      result.current.handlePrimaryClick()
    })

    expect(speak).toHaveBeenCalled()
    expect(spoken.length).toBeGreaterThan(0)
  })

  it('advances to the next TOC block after the current chunk queue finishes', async () => {
    jest.useFakeTimers()
    const twoBlockSections: GospelSection[] = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          { title: 'Part A', content: 'Alpha sentence.' },
          { title: 'Part B', content: 'Beta sentence.' },
        ],
      },
    ]

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

    const listenPlaybackRateRef = { current: 1 as const }
    const { result } = renderHook(() =>
      useProfileListenSession({
        sections: twoBlockSections,
        profileSlug: 'p1',
        listenPlaybackRateRef,
      })
    )

    act(() => {
      result.current.handlePrimaryClick()
    })
    await act(async () => {
      await Promise.resolve()
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })

    expect(spoken.some((text) => text.includes('Alpha'))).toBe(true)
    expect(spoken.some((text) => text.includes('Beta'))).toBe(true)
    jest.useRealTimers()
  })
})
