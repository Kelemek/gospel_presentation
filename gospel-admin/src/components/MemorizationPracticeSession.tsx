'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import {
  pickRandomAllDoneMessage,
  pickRandomRoundAffirmation,
} from '@/lib/memorizationEncouragementMessages'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  firstLetterOfWord,
  generateMemorizationSessionSeed,
  getWordsForMemorization,
  hiddenFractionForRound,
  pickHiddenWordIndices,
} from '@/lib/memorizationPracticeUtils'

export interface MemorizationPracticeSessionResult {
  wrongAttempts: number
  correctKeystrokes: number
  completed: boolean
}

interface MemorizationPracticeSessionProps {
  verse: MemorizedVerse
  onClose: () => void
  onComplete: (result: MemorizationPracticeSessionResult) => void
}

type Phase = 'intro' | 'practicing' | 'done'

const MAX_WRONG_BEFORE_REVEAL = 3

export default function MemorizationPracticeSession({
  verse,
  onClose,
  onComplete,
}: MemorizationPracticeSessionProps) {
  const words = useMemo(() => getWordsForMemorization(verse.text), [verse.text])

  const [phase, setPhase] = useState<Phase>('intro')
  const [roundIndex, setRoundIndex] = useState(0)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [consecutiveWrong, setConsecutiveWrong] = useState(0)
  const [wrongAttemptsTotal, setWrongAttemptsTotal] = useState(0)
  const [correctKeystrokesTotal, setCorrectKeystrokesTotal] = useState(0)
  const [flashError, setFlashError] = useState(false)
  const [hintHeld, setHintHeld] = useState(false)
  /** While hint is held: how many unrevealed blanks (left-to-right) to peek, starting at 1; +1 every 3s. */
  const [hintPeekCount, setHintPeekCount] = useState(1)
  /** Rounds 1–4: all blanks filled; show Repeat/Next in modal footer without leaving the verse view. */
  const [awaitingRoundAdvance, setAwaitingRoundAdvance] = useState(false)
  const [roundAffirmation, setRoundAffirmation] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const completedRef = useRef(false)
  /** Avoid duplicate advance handling when the completion effect runs twice (e.g. Strict Mode). */
  const roundAdvanceHandledRef = useRef<number | null>(null)
  /** New seed for each time user taps Start practice; reused for rounds/repeat in same session. */
  const sessionSeedRef = useRef<string>('')
  /** Focused during practice so mobile/Capacitor WebView can show the soft keyboard. */
  const practiceInputRef = useRef<HTMLInputElement>(null)
  /** If keydown already handled a letter, skip the matching input event (avoids double counts). */
  const suppressInputFromKeydownRef = useRef(false)

  useEffect(() => {
    sessionSeedRef.current = ''
    setAwaitingRoundAdvance(false)
    setRoundAffirmation('')
    setCompletionMessage('')
    completedRef.current = false
    roundAdvanceHandledRef.current = null
  }, [verse.id])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    if (phase !== 'practicing') setHintHeld(false)
  }, [phase])

  const hiddenSorted = useMemo(() => [...hiddenIndices].sort((a, b) => a - b), [hiddenIndices])

  const unrevealedHiddenSorted = useMemo(
    () => hiddenSorted.filter((i) => !revealed.has(i)),
    [hiddenSorted, revealed]
  )

  const unrevealedLenRef = useRef(0)
  useEffect(() => {
    unrevealedLenRef.current = unrevealedHiddenSorted.length
  }, [unrevealedHiddenSorted])

  const hintPeekIndices = useMemo(() => {
    if (!hintHeld) return new Set<number>()
    return new Set(unrevealedHiddenSorted.slice(0, hintPeekCount))
  }, [hintHeld, unrevealedHiddenSorted, hintPeekCount])

  useEffect(() => {
    if (!hintHeld) {
      setHintPeekCount(1)
      return
    }
    setHintPeekCount(1)
    const id = window.setInterval(() => {
      setHintPeekCount((c) => Math.min(c + 1, unrevealedLenRef.current))
    }, 3000)
    return () => {
      window.clearInterval(id)
    }
  }, [hintHeld])

  const currentTargetIndex = useMemo(() => {
    for (const idx of hiddenSorted) {
      if (!revealed.has(idx)) return idx
    }
    return null
  }, [hiddenSorted, revealed])

  const startRound = useCallback(
    (r: number) => {
      roundAdvanceHandledRef.current = null
      const seed = sessionSeedRef.current || verse.id
      const hidden = pickHiddenWordIndices(words.length, r, seed)
      setRoundIndex(r)
      setHiddenIndices(hidden)
      setRevealed(new Set())
      setConsecutiveWrong(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setPhase('practicing')
    },
    [words.length, verse.id]
  )

  useEffect(() => {
    if (phase !== 'practicing' || hiddenIndices.size === 0) return
    const allDone = [...hiddenIndices].every((i) => revealed.has(i))
    if (!allDone) return
    if (roundIndex >= MEMORIZATION_FULL_HIDE_ROUND) {
      if (completedRef.current) return
      completedRef.current = true
      onComplete({
        wrongAttempts: wrongAttemptsTotal,
        correctKeystrokes: correctKeystrokesTotal,
        completed: true,
      })
      setCompletionMessage(pickRandomAllDoneMessage())
      setPhase('done')
    } else {
      if (roundAdvanceHandledRef.current === roundIndex) return
      roundAdvanceHandledRef.current = roundIndex
      setRoundAffirmation(pickRandomRoundAffirmation())
      setAwaitingRoundAdvance(true)
    }
  }, [
    phase,
    hiddenIndices,
    revealed,
    roundIndex,
    wrongAttemptsTotal,
    correctKeystrokesTotal,
    onComplete,
  ])

  const processLetter = useCallback(
    (key: string) => {
      if (hintHeld) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (key.length !== 1 || !/^[a-zA-Z]$/.test(key)) return
      const expected = firstLetterOfWord(words[currentTargetIndex])
      if (!expected) return
      if (key.toLowerCase() === expected) {
        const idx = currentTargetIndex
        setRevealed((prev) => {
          const next = new Set(prev)
          next.add(idx)
          return next
        })
        setConsecutiveWrong(0)
        setCorrectKeystrokesTotal((c) => c + 1)
      } else {
        setWrongAttemptsTotal((w) => w + 1)
        setConsecutiveWrong((c) => {
          const n = c + 1
          if (n >= MAX_WRONG_BEFORE_REVEAL) {
            const idx = currentTargetIndex
            setRevealed((prev) => {
              const next = new Set(prev)
              next.add(idx)
              return next
            })
            setCorrectKeystrokesTotal((ck) => ck + 1)
            return 0
          }
          return n
        })
        setFlashError(true)
        window.setTimeout(() => setFlashError(false), 120)
      }
    },
    [phase, currentTargetIndex, words, hintHeld]
  )

  const handlePracticeInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (hintHeld) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key
      if (key.length !== 1) return
      if (!/^[a-zA-Z]$/.test(key)) return
      e.preventDefault()
      suppressInputFromKeydownRef.current = true
      processLetter(key)
      window.setTimeout(() => {
        suppressInputFromKeydownRef.current = false
      }, 0)
    },
    [phase, currentTargetIndex, hintHeld, processLetter]
  )

  /** Mobile keyboards often omit keydown letters; input events still receive the character. */
  const handlePracticeInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      if (suppressInputFromKeydownRef.current) {
        e.currentTarget.value = ''
        return
      }
      if (hintHeld) {
        e.currentTarget.value = ''
        return
      }
      if (phase !== 'practicing' || currentTargetIndex === null) {
        e.currentTarget.value = ''
        return
      }
      const el = e.currentTarget
      const v = el.value
      if (v.length === 0) return
      const last = v.slice(-1)
      el.value = ''
      if (!/^[a-zA-Z]$/.test(last)) return
      processLetter(last)
    },
    [phase, currentTargetIndex, hintHeld, processLetter]
  )

  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null || hintHeld) {
      if (phase !== 'practicing' || awaitingRoundAdvance) {
        practiceInputRef.current?.blur()
      }
      return
    }
    const id = window.setTimeout(() => {
      practiceInputRef.current?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(id)
  }, [phase, awaitingRoundAdvance, roundIndex, currentTargetIndex, hintHeld])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  if (words.length === 0) {
    return (
      <div
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memorize-practice-title"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-600">
          <p className="text-slate-700 dark:text-slate-200">No words to practice for this passage.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="memorize-practice-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-600 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-600 shrink-0">
          <div>
            <h2 id="memorize-practice-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Memorize
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{verse.reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-4 flex-1 min-h-0 overflow-y-auto">
          {phase === 'intro' && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Read the verse, then practice by typing the first letter of each hidden word in order.
              </p>
              <p
                className="text-base leading-relaxed text-slate-900 dark:text-slate-100 font-serif"
                data-testid="memorize-intro-text"
              >
                {words.join(' ')}
              </p>
              <button
                type="button"
                onClick={() => {
                  completedRef.current = false
                  sessionSeedRef.current = generateMemorizationSessionSeed()
                  startRound(1)
                }}
                className="mt-6 w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                Start practice
              </button>
            </div>
          )}

          {phase === 'practicing' && (
            <div>
              <input
                ref={practiceInputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-label="Type the first letter of each blank word"
                data-testid="memorize-practice-input"
                className="sr-only"
                tabIndex={0}
                onKeyDown={handlePracticeInputKeyDown}
                onInput={handlePracticeInput}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {awaitingRoundAdvance ? (
                    <>
                      Round {roundIndex} complete — repeat or continue to round {roundIndex + 1}.
                    </>
                  ) : (
                    <>
                      Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — about{' '}
                      {Math.round(hiddenFractionForRound(roundIndex) * 100)}% hidden
                    </>
                  )}
                </p>
                {!awaitingRoundAdvance && (
                  <button
                    type="button"
                    data-testid="memorize-hint-button"
                    className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600 active:bg-blue-200 dark:active:bg-blue-900/70 select-none touch-manipulation"
                    aria-pressed={hintHeld}
                    aria-label="Hold to peek at hidden words; adds the next word every 3 seconds"
                    title="Hold to peek; next blank every 3s while held"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      practiceInputRef.current?.blur()
                      setHintHeld(true)
                    }}
                    onPointerUp={() => setHintHeld(false)}
                    onPointerLeave={() => setHintHeld(false)}
                    onPointerCancel={() => setHintHeld(false)}
                  >
                    Hint
                  </button>
                )}
              </div>
              {!awaitingRoundAdvance && currentTargetIndex !== null && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Type the first letter of the next blank word (left to right). Hold Hint to peek; another blank
                  appears every 3 seconds while you hold.
                </p>
              )}
              <div
                className={`text-base leading-relaxed font-serif flex flex-wrap gap-x-1 gap-y-2 items-baseline rounded-md p-1 ring-2 ring-inset transition-shadow ${
                  flashError
                    ? 'ring-red-400 dark:ring-red-500'
                    : 'ring-transparent'
                }`}
                data-testid="memorize-practice-words"
              >
                {words.map((w, i) => {
                  const isHidden = hiddenIndices.has(i)
                  const isRevealed = revealed.has(i)
                  const showViaHint = hintHeld && isHidden && !isRevealed && hintPeekIndices.has(i)
                  const showBlankUnderline = isHidden && !isRevealed
                  const isCurrent = showBlankUnderline && i === currentTargetIndex

                  // One layout for every word: same border box (visible underline only while blank),
                  // inner always renders {w} so width never changes when a blank is filled in.
                  let innerClass = 'text-slate-900 dark:text-slate-100'
                  if (showBlankUnderline) {
                    innerClass = showViaHint
                      ? 'text-blue-800 dark:text-blue-200 italic'
                      : 'text-transparent select-none pointer-events-none'
                  }

                  return (
                    <span
                      key={`word-${i}`}
                      className={`inline-flex items-baseline border-b-2 box-border px-0.5 min-h-[1.5em] ${
                        showBlankUnderline
                          ? 'border-slate-400 dark:border-slate-500'
                          : 'border-transparent'
                      } ${isCurrent ? 'bg-blue-100/80 dark:bg-blue-900/40' : ''}`}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      <span
                        className={innerClass}
                        aria-hidden={showBlankUnderline && !showViaHint}
                      >
                        {w}
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-6">
              <p
                className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3"
                data-testid="memorize-completion-message"
              >
                {completionMessage}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You can close when you are ready.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                Done
              </button>
            </div>
          )}
          </div>

          {phase === 'practicing' && awaitingRoundAdvance && (
            <div
              className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-900/60"
              data-testid="memorize-round-advance-footer"
            >
              <p
                className="text-sm font-medium text-emerald-900 dark:text-emerald-100 text-center sm:text-left mb-3"
                data-testid="memorize-round-affirmation"
              >
                {roundAffirmation}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => startRound(roundIndex)}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Repeat this round
                </button>
                <button
                  type="button"
                  onClick={() => startRound(roundIndex + 1)}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  Next round
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
