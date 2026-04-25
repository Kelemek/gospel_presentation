/**
 * @jest-environment jsdom
 */

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}))

jest.mock('@/lib/memorizeNativeSpeech', () => ({
  isMemorizeSpeechAvailable: jest.fn(async () => false),
  isMemorizeSpeechPluginInNativeBuild: jest.fn(() => false),
  requestMemorizeSpeechPermissions: jest.fn(async () => true),
  startVoicePtt: jest.fn(async () => ({ stop: jest.fn() })),
}))

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

async function pickTypingAndStartPractice(user: ReturnType<typeof userEvent['setup']>) {
  await user.click(screen.getByRole('button', { name: /Type \(first letter\)/i }))
  await user.click(screen.getByRole('button', { name: /Start practice/i }))
}

function firePickTypingAndStartPractice() {
  fireEvent.click(screen.getByRole('button', { name: /Type \(first letter\)/i }))
  fireEvent.click(screen.getByRole('button', { name: /Start practice/i }))
}

describe('MemorizationPracticeSession', () => {
  beforeEach(() => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(false)
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
    await pickTypingAndStartPractice(user)
    expect(screen.getByTestId('memorize-practice-words')).toBeInTheDocument()
    expect(screen.getByText(/Round 1 of 5/i)).toBeInTheDocument()
  })

  it('refocuses the practice input when tapping the verse area (soft keyboard recovery)', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await pickTypingAndStartPractice(user)
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
    await pickTypingAndStartPractice(user)
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
    firePickTypingAndStartPractice()
    const hint = screen.getByTestId('memorize-hint-button')
    fireEvent.pointerDown(hint)
    const countHintPeek = () =>
      screen.getByTestId('memorize-practice-words').querySelectorAll('[data-memorize-hint-peek="true"]')
        .length
    expect(countHintPeek()).toBe(1)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(countHintPeek()).toBe(2)
    fireEvent.pointerUp(hint)
    jest.useRealTimers()
  })

  it('resets hint peek to one blank after release so a new hold in the same round starts from the first', () => {
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
    firePickTypingAndStartPractice()
    const hint = screen.getByTestId('memorize-hint-button')
    const countHintPeek = () =>
      screen.getByTestId('memorize-practice-words').querySelectorAll('[data-memorize-hint-peek="true"]')
        .length
    fireEvent.pointerDown(hint)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(countHintPeek()).toBe(2)
    fireEvent.pointerUp(hint)
    fireEvent.pointerDown(hint)
    expect(countHintPeek()).toBe(1)
    jest.useRealTimers()
  })

  it('keeps the verse visible and shows repeat/next in the modal footer when a round completes', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await pickTypingAndStartPractice(user)
    const practiceInput = await screen.findByTestId('memorize-practice-input')
    await user.click(practiceInput)
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
    await pickTypingAndStartPractice(user)
    const practiceInput = await screen.findByTestId('memorize-practice-input')
    await user.click(practiceInput)
    await user.keyboard('f')
    expect(onPersistInProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
        practiceKind: 'typing',
      })
    )
  })

  it('resumes betweenRounds: shows mode pick first, then continues after Type + Start practice', async () => {
    const user = userEvent.setup()
    const verseWithProgress: MemorizedVerse = {
      ...baseVerse,
      inProgressPractice: {
        sessionSeed: 'resume-seed',
        wrongAttempts: 0,
        correctKeystrokes: 1,
        updatedAt: 99,
        practiceKind: 'typing',
        phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
      },
    }
    render(
      <MemorizationPracticeSession verse={verseWithProgress} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.getByText(/Choose how you would like to practice/)).toBeInTheDocument()
    await pickTypingAndStartPractice(user)
    expect(screen.getByTestId('memorize-round-advance-footer')).toBeInTheDocument()
  })

  it('clamps Android scroll to 0 for the first 600ms after practice starts', async () => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(true)
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await pickTypingAndStartPractice(user)

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
