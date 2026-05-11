/**
 * @jest-environment jsdom
 */

const memorizeUtilsTestOverrides: { sessionSeed: string | null } = { sessionSeed: null }

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
    pickHiddenCueTypableSlotIndices: jest.fn(
      (typableCount: number, roundIndex: number, seedStr: string) =>
        actual.pickHiddenCueTypableSlotIndices(typableCount, roundIndex, seedStr)
    ),
    generateMemorizationSessionSeed: () =>
      memorizeUtilsTestOverrides.sessionSeed ?? actual.generateMemorizationSessionSeed(),
  }
})

jest.mock('@/lib/memorizationEncouragementMessages', () => ({
  pickRandomRoundAffirmation: () => 'Test round affirmation.',
  pickRandomAllDoneMessage: () => 'Test all done.',
}))

jest.mock('@/lib/memorizationViewportPlatform', () => ({
  isMemorizeAndroidWebHost: jest.fn(() => false),
  isMemorizeIosWebHost: jest.fn(() => false),
}))

import { MEMORIZE_LISTEN_SPEED_STORAGE_KEY } from '@/lib/memorizeListenSpeedStorage'
import * as memorizationUtils from '@/lib/memorizationPracticeUtils'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

async function chooseTypeModeAfterStart(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Start practice/i }))
  await user.click(screen.getByTestId('memorize-practice-mode-type'))
}

function chooseTypeModeSync() {
  fireEvent.click(screen.getByRole('button', { name: /Start practice/i }))
  fireEvent.click(screen.getByTestId('memorize-practice-mode-type'))
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

  it('shows Listen in the header and Start practice on intro', () => {
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.getByTestId('memorize-listen-open')).toHaveTextContent('Listen')
    const startFooter = screen.getByTestId('memorize-intro-footer')
    expect(startFooter.querySelector('[data-tour="memorize-start-practice"]')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Start practice/i })).toBeInTheDocument()
  })

  it('does not show repeat or speed until the read-aloud dialog is open', () => {
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.queryByTestId('memorize-listen-repeat')).not.toBeInTheDocument()
    expect(screen.queryByTestId('memorize-listen-speed')).not.toBeInTheDocument()
  })

  it('shows Repeat and Speed in the read-aloud dialog; toggles repeat mode', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.queryByTestId('memorize-listen-repeat')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('memorize-listen-open'))
    expect(screen.getByTestId('memorize-listen-speed')).toBeInTheDocument()
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
      await user.click(screen.getByTestId('memorize-listen-open'))
      await user.click(screen.getByTestId('memorize-listen-passage'))
      expect(speak).toHaveBeenCalledTimes(1)
      const [utt] = speak.mock.calls[0] ?? []
      expect(utt).toBeDefined()
      const speech = utt as SpeechSynthesisUtterance
      expect(speech.text).toContain('For God so loved the world')
      expect(speech.text).toMatch(/John chapter 3, verse 16/i)
      expect(speech.rate).toBe(1)
      await user.click(screen.getByTestId('memorize-listen-speed'))
      await user.click(screen.getByTestId('memorize-listen-speed-option-1.25'))
      await user.click(screen.getByTestId('memorize-listen-passage'))
      expect(speak).toHaveBeenCalledTimes(2)
      const [utt2] = speak.mock.calls[1] ?? []
      const speech2 = utt2 as SpeechSynthesisUtterance
      expect(speech2.rate).toBe(1.25)
    } finally {
      if (speechSynthesisDesc) {
        Object.defineProperty(window, 'speechSynthesis', speechSynthesisDesc)
      } else {
        Reflect.deleteProperty(window, 'speechSynthesis')
      }
    }
  })

  it('hides Listen for non-ESV on Android', () => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(true)
    const niv: MemorizedVerse = { ...baseVerse, translation: 'niv' }
    render(<MemorizationPracticeSession verse={niv} onClose={jest.fn()} onComplete={jest.fn()} />)
    expect(screen.queryByTestId('memorize-listen-open')).not.toBeInTheDocument()
  })

  it('still shows Listen for ESV on Android', () => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(true)
    render(<MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />)
    expect(screen.getByTestId('memorize-listen-open')).toBeInTheDocument()
  })

  it('persists selected listen speed to localStorage', async () => {
    const user = userEvent.setup()
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByTestId('memorize-listen-open'))
    await user.click(screen.getByTestId('memorize-listen-speed'))
    await user.click(screen.getByTestId('memorize-listen-speed-option-1.5'))
    expect(setItemSpy).toHaveBeenCalledWith(MEMORIZE_LISTEN_SPEED_STORAGE_KEY, '1.5')
    setItemSpy.mockRestore()
  })

  it('shows intro with full verse text', () => {
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.getByTestId('memorize-intro-text')).toHaveTextContent(
      'For God so loved the world John 3:16'
    )
  })

  it('enters practice mode when Start practice is clicked and Type mode is chosen', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await chooseTypeModeAfterStart(user)
    expect(screen.getByTestId('memorize-practice-words')).toBeInTheDocument()
    expect(screen.getByText(/Round 1 of 5/i)).toBeInTheDocument()
    expect(screen.getByTestId('memorize-listen-open')).toBeInTheDocument()
  })

  it('starts at the selected intro round and persists inRound with that round', async () => {
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
    await user.click(screen.getByRole('button', { name: /starting round \(1 to 5\)/i }))
    await user.click(screen.getByRole('option', { name: 'Round 2' }))
    await chooseTypeModeAfterStart(user)
    expect(screen.getByText(/Round 2 of 5/i)).toBeInTheDocument()
    expect(onPersistInProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: { kind: 'inRound', roundIndex: 2 },
        practiceMode: 'type',
      })
    )
  })

  it('refocuses the practice input when tapping the verse area (soft keyboard recovery)', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await chooseTypeModeAfterStart(user)
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
    await chooseTypeModeAfterStart(user)
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
    ;(memorizationUtils.pickHiddenWordIndices as jest.Mock).mockImplementationOnce(
      (wordCount: number, roundIndex: number, seedStr: string) => {
        if (roundIndex === 1) return new Set([0, 1])
        return actual.pickHiddenWordIndices(wordCount, roundIndex, seedStr)
      }
    )
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    chooseTypeModeSync()
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
    await chooseTypeModeAfterStart(user)
    await user.keyboard('f')
    expect(screen.getByTestId('memorize-practice-words')).toHaveTextContent(/For/)
    expect(screen.getByTestId('memorize-round-advance-footer')).toBeInTheDocument()
    expect(screen.getByTestId('memorize-round-affirmation')).toHaveTextContent('Test round affirmation.')
    expect(screen.queryByTestId('memorize-listen-passage')).not.toBeInTheDocument()
    expect(screen.queryByTestId('memorize-round-listen-row')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Repeat this round/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next round/i })).toBeInTheDocument()
    expect(screen.queryByTestId('memorize-hint-button')).not.toBeInTheDocument()
  })

  it('Initials mode reveals a hidden cue when the first letter is typed', async () => {
    const user = userEvent.setup()
    ;(memorizationUtils.pickHiddenCueTypableSlotIndices as jest.Mock).mockReturnValueOnce(new Set([0]))
    render(<MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    await user.click(screen.getByTestId('memorize-practice-mode-initials'))
    const cues = screen.getByTestId('memorize-first-letter-cues')
    expect(cues.textContent?.trim().charAt(0)).toBe('·')
    await user.keyboard('f')
    expect(cues.textContent?.trim().charAt(0)).toBe('F')
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
    await chooseTypeModeAfterStart(user)
    await user.keyboard('f')
    expect(onPersistInProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
        practiceMode: 'type',
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
    expect(screen.queryByTestId('memorize-listen-passage')).not.toBeInTheDocument()
    // Blanks must stay blank while awaiting Repeat/Next — `revealed` tracks filled blanks, not `hiddenIndices`.
    const words = screen.getByTestId('memorize-practice-words')
    expect(words.querySelector('.text-transparent')).toBeTruthy()
  })

  it('resumes reorder betweenRounds with verse chunks in correct order visible', () => {
    const verseComma: MemorizedVerse = {
      ...baseVerse,
      text: 'alpha, beta, gamma',
      inProgressPractice: {
        sessionSeed: 'resume-reorder-between',
        wrongAttempts: 0,
        correctKeystrokes: 2,
        updatedAt: 1,
        phase: { kind: 'betweenRounds', completedRoundIndex: 1 },
        practiceMode: 'reorder',
      },
    }
    render(
      <MemorizationPracticeSession verse={verseComma} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    expect(screen.getByTestId('memorize-round-advance-footer')).toBeInTheDocument()
    const list = screen.getByTestId('memorize-reorder-list')
    const items = list.querySelectorAll('[data-reorder-slot]')
    expect(items.length).toBe(6)
    expect(items[0]).toHaveTextContent('alpha')
    expect(items[1]).toHaveTextContent('beta')
    expect(items[2]).toHaveTextContent('gamma')
    expect(items[3]).toHaveTextContent('John')
    expect(items[4]).toHaveTextContent('3')
    expect(items[5]).toHaveTextContent('16')
    expect(screen.getByTestId('memorize-reorder-chapter-verse-colon')).toHaveTextContent(':')
  })

  it('opens mode picker when Start practice is tapped; Cancel returns to intro', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    expect(screen.getByText(/Choose practice mode/i)).toBeInTheDocument()
    await user.click(screen.getByTestId('memorize-practice-mode-cancel'))
    expect(screen.queryByText(/Choose practice mode/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('memorize-intro-text')).toBeInTheDocument()
  })

  it('word mode shows choice buttons and fills blank on correct tap', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    await user.click(screen.getByTestId('memorize-practice-mode-word'))
    expect(screen.queryByTestId('memorize-practice-input')).not.toBeInTheDocument()
    expect(screen.getByTestId('memorize-word-choices')).toBeInTheDocument()
    const forBtn = screen.getByRole('button', { name: /^For$/i })
    await user.click(forBtn)
    expect(screen.getByTestId('memorize-practice-words')).toHaveTextContent(/For/)
  })

  it('word mode flashes error ring on wrong choice', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    await user.click(screen.getByTestId('memorize-practice-mode-word'))
    const choices = screen.getByTestId('memorize-word-choices')
    const wrongBtn = Array.from(choices.querySelectorAll('button')).find((b) => b.textContent !== 'For')
    expect(wrongBtn).toBeDefined()
    await user.click(wrongBtn!)
    expect(screen.getByTestId('memorize-practice-words').className).toMatch(/ring-red/)
  })

  it('persists practiceMode word when starting word mode', async () => {
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
    await user.click(screen.getByTestId('memorize-practice-mode-word'))
    expect(onPersistInProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        practiceMode: 'word',
        phase: { kind: 'inRound', roundIndex: 1 },
      })
    )
  })

  it('Initials mode shows cue strip and practice input', async () => {
    const user = userEvent.setup()
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /Start practice/i }))
    await user.click(screen.getByTestId('memorize-practice-mode-initials'))
    expect(screen.getByTestId('memorize-practice-input')).toBeInTheDocument()
    const cues = screen.getByTestId('memorize-first-letter-cues')
    expect(cues).toBeInTheDocument()
    expect(cues.textContent).toMatch(/F/)
    expect(screen.getByText(/initials:/i)).toBeInTheDocument()
  })

  it('persists practiceMode firstLetters when starting Initials mode', async () => {
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
    await user.click(screen.getByTestId('memorize-practice-mode-initials'))
    expect(onPersistInProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        practiceMode: 'firstLetters',
        phase: { kind: 'inRound', roundIndex: 1 },
      })
    )
  })

  it('reorder mode shows draggable list; holding Hint peeks first wrong section without persisting swaps', async () => {
    const user = userEvent.setup()
    const onPersistInProgress = jest.fn()
    const verseComma: MemorizedVerse = {
      ...baseVerse,
      text: 'alpha, beta, gamma',
    }
    memorizeUtilsTestOverrides.sessionSeed = 'test-mem-id'
    try {
      render(
        <MemorizationPracticeSession
          verse={verseComma}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onPersistInProgress={onPersistInProgress}
        />
      )
      await user.click(screen.getByRole('button', { name: /Start practice/i }))
      await user.click(screen.getByTestId('memorize-practice-mode-reorder'))
      const list = screen.getByTestId('memorize-reorder-list')
      const hintBtn = screen.getByTestId('memorize-hint-button')
      expect(hintBtn).toBeInTheDocument()
      const correctOrder = ['alpha', 'beta', 'gamma', 'John', '3', '16']
      const items = list.querySelectorAll('[data-reorder-slot]')
      expect(items.length).toBe(correctOrder.length)
      let firstWrongIdx = -1
      for (let i = 0; i < correctOrder.length; i++) {
        if (items[i]?.textContent !== correctOrder[i]) {
          firstWrongIdx = i
          break
        }
      }
      expect(firstWrongIdx).toBeGreaterThanOrEqual(0)
      const wrongSlot = items[firstWrongIdx] as HTMLElement
      expect(wrongSlot.textContent).not.toBe(correctOrder[firstWrongIdx])
      expect(screen.getByRole('dialog', { name: /Memorize practice/i }).textContent).toMatch(
        /Hold Hint to peek/i
      )
      fireEvent.pointerDown(hintBtn)
      expect(wrongSlot.textContent).toBe(correctOrder[firstWrongIdx])
      fireEvent.pointerUp(hintBtn)
      expect(wrongSlot.textContent).not.toBe(correctOrder[firstWrongIdx])
      expect(onPersistInProgress).toHaveBeenCalledTimes(1)
      expect(onPersistInProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          practiceMode: 'reorder',
          phase: { kind: 'inRound', roundIndex: 1 },
        })
      )
    } finally {
      memorizeUtilsTestOverrides.sessionSeed = null
    }
  })

  it('reorder mode invalid drop on fixed slot flashes list error ring', async () => {
    const verseComma: MemorizedVerse = {
      ...baseVerse,
      text: 'alpha, beta, gamma',
    }
    render(<MemorizationPracticeSession verse={verseComma} onClose={jest.fn()} onComplete={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Start practice/i }))
    fireEvent.click(screen.getByTestId('memorize-practice-mode-reorder'))
    const list = screen.getByTestId('memorize-reorder-list')
    const items = list.querySelectorAll('[data-reorder-slot][draggable="true"]')
    expect(items.length).toBeGreaterThanOrEqual(1)
    const dragSrc = items[0] as HTMLElement
    const fixedEl = Array.from(list.querySelectorAll('[data-reorder-slot]')).find(
      (el) => el.getAttribute('draggable') === 'false'
    )
    expect(fixedEl).toBeDefined()
    fireEvent.dragStart(dragSrc, {
      dataTransfer: { setData: jest.fn(), getData: jest.fn(), effectAllowed: 'move' },
    })
    fireEvent.dragOver(fixedEl!, {
      preventDefault: jest.fn(),
      dataTransfer: { dropEffect: 'move', getData: jest.fn() },
    })
    fireEvent.drop(fixedEl!, {
      preventDefault: jest.fn(),
      dataTransfer: { getData: jest.fn() },
    })
    const wrapper = list.parentElement as HTMLElement
    expect(wrapper.className).toMatch(/ring-red/)
  })

  it('clamps Android scroll to 0 for the first 600ms after practice starts', async () => {
    ;(isMemorizeAndroidWebHost as jest.Mock).mockReturnValue(true)
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />
    )
    await chooseTypeModeAfterStart(user)

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

  it('does not show Spurgeon Study without onOpenSpurgeonStudy', () => {
    render(<MemorizationPracticeSession verse={baseVerse} onClose={jest.fn()} onComplete={jest.fn()} />)
    expect(screen.queryByTestId('memorize-practice-spurgeon-study')).not.toBeInTheDocument()
  })

  it('does not show Spurgeon Study when spurgeon-links returns no items', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    } as Response)
    render(
      <MemorizationPracticeSession
        verse={baseVerse}
        onClose={jest.fn()}
        onComplete={jest.fn()}
        onOpenSpurgeonStudy={jest.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.queryByTestId('memorize-practice-spurgeon-study')).not.toBeInTheDocument()
    })
    fetchSpy.mockRestore()
    delete (HTMLElement.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('shows Spurgeon Study when spurgeon-links returns items and calls onOpenSpurgeonStudy on click', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
    const user = userEvent.setup()
    const openStudy = jest.fn()
    const onClose = jest.fn()
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('spurgeon-links')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ slug: 'sg00001', title: 'A Sermon' }] }),
        } as Response)
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    render(
      <MemorizationPracticeSession
        verse={baseVerse}
        onClose={onClose}
        onComplete={jest.fn()}
        onOpenSpurgeonStudy={openStudy}
      />
    )
    const study = await screen.findByTestId('memorize-practice-spurgeon-study')
    expect(study).toHaveTextContent('Study')
    await user.click(study)
    expect(onClose).toHaveBeenCalled()
    expect(openStudy).toHaveBeenCalledWith('John 3:16')
    fetchSpy.mockRestore()
    delete (HTMLElement.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView
  })
})
