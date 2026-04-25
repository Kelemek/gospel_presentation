/**
 * @jest-environment jsdom
 */

jest.mock('@/lib/memorizationPracticeUtils', () => {
  const actual = jest.requireActual<typeof import('@/lib/memorizationPracticeUtils')>(
    '@/lib/memorizationPracticeUtils'
  )
  return {
    ...actual,
    pickHiddenWordIndices: jest.fn(
      (wordCount: number, roundIndex: number, seedStr: string) => {
        if (roundIndex === 1) return new Set([0])
        return actual.pickHiddenWordIndices(wordCount, roundIndex, seedStr)
      }
    ),
  }
})

jest.mock('@/lib/memorizationEncouragementMessages', () => ({
  pickRandomRoundAffirmation: () => 'Test round affirmation.',
  pickRandomAllDoneMessage: () => 'Test all done.',
}))

jest.mock('@/lib/memorizationViewportPlatform', () => ({
  isMemorizeAndroidWebHost: jest.fn(() => false),
}))

import { pickHiddenWordIndices } from '@/lib/memorizationPracticeUtils'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemorizationPracticeSession from '@/components/MemorizationPracticeSession'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

const baseVerse: MemorizedVerse = {
  id: 'test-mem-id',
  reference: 'John 3:16',
  text: 'For God so loved the world',
  translation: 'esv',
  dateAdded: Date.now(),
  lastPracticedAt: null,
  practiceSessions: [],
}

describe('MemorizationPracticeSession', () => {
  let playSpy: jest.SpiedFunction<() => Promise<void>>

  beforeEach(() => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(false)
    playSpy = jest
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())
  })

  afterEach(() => {
    playSpy.mockRestore()
  })

  it('shows Listen to the right of Start practice on intro', () => {
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.getByTestId('memorize-listen-passage')).toHaveTextContent('Listen')
    expect(screen.getByRole('button', { name: /Start practice/i })).toBeInTheDocument()
  })

  it('shows Repeat after Listen; toggles repeat mode', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.queryByTestId('memorize-listen-repeat')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const repeat = screen.getByTestId('memorize-listen-repeat')
    expect(repeat).toHaveTextContent('Repeat')
    await user.click(repeat)
    expect(repeat).toHaveTextContent('Repeat on')
    expect(repeat).toHaveAttribute('aria-pressed', 'true')
  })

  it('uses device speech for non-ESV (saved verse only), not the audio element', async () => {
    const user = userEvent.setup()
    const speak = jest.fn()
    const tts = {
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
    }
    const speechSynthesisDesc = Object.getOwnPropertyDescriptor(window, 'speechSynthesis')
    try {
      Object.defineProperty(window, 'speechSynthesis', {
        value: tts as unknown as SpeechSynthesis,
        configurable: true,
        writable: true,
      })
      const niv: MemorizedVerse = { ...baseVerse, translation: 'niv' }
      const { container } = render(
        <MemorizationPracticeSession verse={niv} onClose={jest.fn()} onComplete={jest.fn()} />
      )
      expect(container.querySelector('audio')).toBeNull()
      await user.click(screen.getByTestId('memorize-listen-passage'))
      expect(speak).toHaveBeenCalledTimes(1)
      const [utt] = speak.mock.calls[0] ?? []
      expect(utt).toBeDefined()
      const speech = utt as SpeechSynthesisUtterance
      expect(speech.text).toContain('For God so loved the world')
      expect(speech.text).toMatch(/John chapter 3, verse 16/i)
    } finally {
      if (speechSynthesisDesc) {
        Object.defineProperty(window, 'speechSynthesis', speechSynthesisDesc)
      } else {
        Reflect.deleteProperty(window, 'speechSynthesis')
      }
    }
  })

  it('shows intro with full verse text', () => {
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.getByTestId('memorize-intro-text')).toHaveTextContent(
      'For God so loved the world John 3:16'
    )
  })

  it('enters practice mode when Start practice is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    expect(screen.getByTestId('memorize-practice-words')).toBeInTheDocument()
    expect(screen.getByText(/Round 1 of 5/i)).toBeInTheDocument()
  })

  it('refocuses the practice input when tapping the verse area (soft keyboard recovery)', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    const input = screen.getByTestId('memorize-practice-input') as HTMLInputElement
    const focusSpy = jest.spyOn(input, 'focus')
    input.blur()
    fireEvent.pointerDown(screen.getByTestId('memorize-practice-words'))
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('shows Hint control during practice; holding peeks blanks progressively', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    const hint = screen.getByTestId('memorize-hint-button')
    expect(hint).toHaveAttribute('aria-pressed', 'false')
    fireEvent.pointerDown(hint)
    expect(hint).toHaveAttribute('aria-pressed', 'true')
    fireEvent.pointerUp(hint)
    expect(hint).toHaveAttribute('aria-pressed', 'false')
  })

  it('while holding Hint, peeks one more blank every second', () => {
    jest.useFakeTimers()
    const actual = jest.requireActual<typeof import('@/lib/memorizationPracticeUtils')>(
      '@/lib/memorizationPracticeUtils'
    )
    ;(pickHiddenWordIndices as jest.Mock).mockImplementationOnce(
      (wordCount: number, roundIndex: number, seedStr: string) => {
        if (roundIndex === 1) return new Set([0, 1])
        return actual.pickHiddenWordIndices(wordCount, roundIndex, seedStr)
      }
    )
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Start practice/i }))
    const hint = screen.getByTestId('memorize-hint-button')
    fireEvent.pointerDown(hint)
    const countItalic = () =>
      screen.getByTestId('memorize-practice-words').querySelectorAll('.italic').length
    expect(countItalic()).toBe(1)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(countItalic()).toBe(2)
    fireEvent.pointerUp(hint)
    jest.useRealTimers()
  })

  it('keeps the verse visible and shows repeat/next in the modal footer when a round completes', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    await user.keyboard('f')
    expect(screen.getByTestId('memorize-practice-words')).toHaveTextContent(/For/)
    expect(screen.getByTestId('memorize-round-advance-footer')).toBeInTheDocument()
    expect(screen.getByTestId('memorize-round-affirmation')).toHaveTextContent('Test round affirmation.')
    expect(screen.getByRole('button', { name: /Repeat this round/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next round/i })).toBeInTheDocument()
    expect(screen.queryByTestId('memorize-hint-button')).not.toBeInTheDocument()
  })

  it('calls onPersistInProgress with betweenRounds when an intermediate round completes', async () => {
    const user = userEvent.setup()
    const onPersistInProgress = jest.fn()
    render(
      <MemorizationPracticeSession
        verse={baseVerse}
        onClose={jest.fn()}
        onComplete={jest.fn()}
        onPersistInProgress={onPersistInProgress}
      />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    await user.keyboard('f')
    expect(onPersistInProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
      })
    )
  })

  it('resumes betweenRounds from verse.inProgressPractice without showing intro', () => {
    const verseWithProgress: MemorizedVerse = {
      ...baseVerse,
      inProgressPractice: {
        sessionSeed: 'resume-seed',
        wrongAttempts: 0,
        correctKeystrokes: 1,
        updatedAt: 99,
        phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
      },
    }
    render(
      <MemorizationPracticeSession verse={verseWithProgress} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.queryByTestId('memorize-intro-text')).not.toBeInTheDocument()
    expect(screen.getByTestId('memorize-round-advance-footer')).toBeInTheDocument()
  })

  it('clamps Android scroll to 0 for the first 600ms after practice starts', async () => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(true)
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))

    const scrollEl = screen
      .getByTestId('memorize-practice-words')
      .closest('.overflow-y-auto') as HTMLDivElement
    expect(scrollEl).toBeTruthy()

    scrollEl.scrollTop = 500
    fireEvent.scroll(scrollEl)
    expect(scrollEl.scrollTop).toBe(0)

    act(() => { jest.advanceTimersByTime(700) })

    scrollEl.scrollTop = 500
    fireEvent.scroll(scrollEl)
    expect(scrollEl.scrollTop).toBe(500)

    jest.useRealTimers()
  })
})
