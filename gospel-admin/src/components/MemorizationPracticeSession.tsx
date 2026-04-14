'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { flushSync } from 'react-dom'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import {
  pickRandomAllDoneMessage,
  pickRandomRoundAffirmation,
} from '@/lib/memorizationEncouragementMessages'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  buildMemorizationTokens,
  firstLetterOfWord,
  formatMemorizationTokensPlain,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  hiddenFractionForRound,
  pickHiddenWordIndices,
  type MemorizationToken,
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

function expectedKeystrokeForToken(token: MemorizationToken): string {
  if (token.kind === 'digit') return token.text
  if (token.kind === 'word') return firstLetterOfWord(token.text)
  return ''
}

export default function MemorizationPracticeSession({
  verse,
  onClose,
  onComplete,
}: MemorizationPracticeSessionProps) {
  const tokens = useMemo(
    () => buildMemorizationTokens(verse.text, verse.reference),
    [verse.text, verse.reference]
  )
  const typableIndices = useMemo(() => getTypableTokenIndices(tokens), [tokens])

  const [phase, setPhase] = useState<Phase>('intro')
  const [roundIndex, setRoundIndex] = useState(0)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [, setConsecutiveWrong] = useState(0)
  const [wrongAttemptsTotal, setWrongAttemptsTotal] = useState(0)
  const [correctKeystrokesTotal, setCorrectKeystrokesTotal] = useState(0)
  const [flashError, setFlashError] = useState(false)
  const [hintHeld, setHintHeld] = useState(false)
  /** While hint is held: how many unrevealed blanks (left-to-right) to peek, starting at 1; +1 every 3s. */
  const [hintPeekCount, setHintPeekCount] = useState(1)
  /** Rounds 1–4: all blanks filled; show Repeat/Next in modal footer without leaving the verse view. */
  const [awaitingRoundAdvance, setAwaitingRoundAdvance] = useState(false)
  const awaitingRoundAdvanceRef = useRef(false)
  awaitingRoundAdvanceRef.current = awaitingRoundAdvance
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
  const practiceWordsRef = useRef<HTMLDivElement>(null)
  const hintButtonRef = useRef<HTMLButtonElement>(null)
  /** Extra bottom padding when the on-screen keyboard shrinks visualViewport (mobile / Capacitor). */
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0)

  useEffect(() => {
    sessionSeedRef.current = ''
    completedRef.current = false
    roundAdvanceHandledRef.current = null
    startTransition(() => {
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setCompletionMessage('')
    })
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
    const vv = window.visualViewport
    if (!vv) return
    const updateInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInsetPx(inset)
    }
    updateInset()
    vv.addEventListener('resize', updateInset)
    vv.addEventListener('scroll', updateInset)
    return () => {
      vv.removeEventListener('resize', updateInset)
      vv.removeEventListener('scroll', updateInset)
    }
  }, [])

  /** Raw pointer state; use hintActive for gameplay so we do not sync hintHeld in an effect when phase changes. */
  const hintActive = hintHeld && phase === 'practicing'

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
    if (!hintActive) return new Set<number>()
    return new Set(unrevealedHiddenSorted.slice(0, hintPeekCount))
  }, [hintActive, unrevealedHiddenSorted, hintPeekCount])

  useEffect(() => {
    if (!hintActive) return
    const id = window.setInterval(() => {
      setHintPeekCount((c) => Math.min(c + 1, unrevealedLenRef.current))
    }, 3000)
    return () => {
      window.clearInterval(id)
    }
  }, [hintActive])

  const currentTargetIndex = useMemo(() => {
    for (const idx of hiddenSorted) {
      if (!revealed.has(idx)) return idx
    }
    return null
  }, [hiddenSorted, revealed])

  const currentTargetToken =
    currentTargetIndex !== null ? (tokens[currentTargetIndex] ?? null) : null

  const startRound = useCallback(
    (r: number) => {
      roundAdvanceHandledRef.current = null
      const seed = sessionSeedRef.current || verse.id
      const localHidden = pickHiddenWordIndices(typableIndices.length, r, seed)
      const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
      setRoundIndex(r)
      setHiddenIndices(hidden)
      setRevealed(new Set())
      setConsecutiveWrong(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setPhase('practicing')
    },
    [typableIndices, verse.id]
  )

  /** Scroll the active blank to the vertical center of the scrollable panel (long verses + keyboard). */
  const scrollCurrentBlankIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const root = practiceWordsRef.current
      if (!root) return
      const el = root.querySelector<HTMLElement>('[data-memorize-current-blank="true"]')
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'center', behavior: 'auto', inline: 'nearest' })
      }
    })
  }, [])

  /**
   * Taps hit the verse / Hint control, not the hidden input — the browser blurs the input and dismisses the keyboard.
   * Capture-phase listeners with passive:false on touchstart let us preventDefault when the input is already focused,
   * so the keyboard stays up; otherwise we focus to bring it back (no scroll — avoids iOS fighting the keyboard).
   */
  const keepPracticeInputOnPointerCapture = useCallback((e: PointerEvent | TouchEvent) => {
    if (awaitingRoundAdvanceRef.current) return
    const input = practiceInputRef.current
    if (!input) return
    if (document.activeElement === input) {
      e.preventDefault()
      return
    }
    input.focus({ preventScroll: true })
  }, [])

  /**
   * Verse area: do NOT use touchstart + preventDefault — that blocks vertical scrolling on long passages.
   * Mouse/pen: capture pointerdown to keep focus when tapping the verse. Touch uses native scroll; touchend refocuses.
   */
  useLayoutEffect(() => {
    if (phase !== 'practicing') return
    const el = practiceWordsRef.current
    if (!el) return
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      keepPracticeInputOnPointerCapture(e)
    }
    el.addEventListener('pointerdown', onPointerDownCapture, { capture: true })
    return () => {
      el.removeEventListener('pointerdown', onPointerDownCapture, { capture: true })
    }
  }, [phase, keepPracticeInputOnPointerCapture])

  useLayoutEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance) return
    const el = hintButtonRef.current
    if (!el) return
    el.addEventListener('touchstart', keepPracticeInputOnPointerCapture, { capture: true, passive: false })
    el.addEventListener('pointerdown', keepPracticeInputOnPointerCapture, { capture: true })
    return () => {
      el.removeEventListener('touchstart', keepPracticeInputOnPointerCapture, { capture: true })
      el.removeEventListener('pointerdown', keepPracticeInputOnPointerCapture, { capture: true })
    }
  }, [phase, awaitingRoundAdvance, keepPracticeInputOnPointerCapture])

  /** After releasing Hint, WebKit may leave focus on the button — put it back on the hidden field. */
  const restorePracticeInputFocusAfterHint = useCallback(() => {
    requestAnimationFrame(() => {
      if (awaitingRoundAdvanceRef.current) return
      if (phase !== 'practicing') return
      practiceInputRef.current?.focus({ preventScroll: true })
    })
  }, [phase])

  /** flushSync + immediate focus keeps iOS / Capacitor WebView keyboard in the same user gesture as the tap. */
  const startRoundAndFocusInput = useCallback(
    (r: number) => {
      flushSync(() => {
        startRound(r)
      })
      practiceInputRef.current?.focus({ preventScroll: true })
      scrollCurrentBlankIntoView()
    },
    [startRound, scrollCurrentBlankIntoView]
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
      startTransition(() => {
        setCompletionMessage(pickRandomAllDoneMessage())
        setPhase('done')
      })
    } else {
      if (roundAdvanceHandledRef.current === roundIndex) return
      roundAdvanceHandledRef.current = roundIndex
      startTransition(() => {
        setRoundAffirmation(pickRandomRoundAffirmation())
        setAwaitingRoundAdvance(true)
      })
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

  const processKeystroke = useCallback(
    (key: string) => {
      if (hintActive) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (key.length !== 1) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return

      let correct = false
      if (token.kind === 'digit') {
        if (!/^[0-9]$/.test(key)) return
        correct = key === token.text
      } else {
        if (!/^[a-zA-Z]$/.test(key)) return
        const expected = expectedKeystrokeForToken(token)
        if (!expected) return
        correct = key.toLowerCase() === expected
      }

      if (correct) {
        const idx = currentTargetIndex
        setRevealed((prev) => {
          const next = new Set(prev)
          next.add(idx)
          return next
        })
        setConsecutiveWrong(0)
        setCorrectKeystrokesTotal((c) => c + 1)
      } else {
        const isWrongKind =
          (token.kind === 'digit' && /^[0-9]$/.test(key)) ||
          (token.kind === 'word' && /^[a-zA-Z]$/.test(key))
        if (!isWrongKind) return
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
    [phase, currentTargetIndex, tokens, hintActive]
  )

  const handlePracticeInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (hintActive) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key
      if (key.length !== 1) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return
      const allow =
        token.kind === 'digit' ? /^[0-9]$/.test(key) : /^[a-zA-Z]$/.test(key)
      if (!allow) return
      e.preventDefault()
      suppressInputFromKeydownRef.current = true
      processKeystroke(key)
      window.setTimeout(() => {
        suppressInputFromKeydownRef.current = false
      }, 0)
    },
    [phase, currentTargetIndex, hintActive, processKeystroke, tokens]
  )

  /** Mobile keyboards often omit keydown letters; input events still receive the character. */
  const handlePracticeInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      if (suppressInputFromKeydownRef.current) {
        e.currentTarget.value = ''
        return
      }
      if (hintActive) {
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
      const token = currentTargetIndex !== null ? tokens[currentTargetIndex] : null
      if (!token || token.kind === 'punct') return
      const ok =
        token.kind === 'digit' ? /^[0-9]$/.test(last) : /^[a-zA-Z]$/.test(last)
      if (!ok) return
      processKeystroke(last)
    },
    [phase, currentTargetIndex, hintActive, processKeystroke, tokens]
  )

  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null || hintActive) {
      if (phase !== 'practicing' || awaitingRoundAdvance) {
        practiceInputRef.current?.blur()
      }
      return
    }
    const id = window.setTimeout(() => {
      practiceInputRef.current?.focus({ preventScroll: true })
      scrollCurrentBlankIntoView()
    }, 0)
    return () => window.clearTimeout(id)
  }, [phase, awaitingRoundAdvance, roundIndex, currentTargetIndex, hintActive, scrollCurrentBlankIntoView])

  /** Keep the active blank centered as you advance (and after round changes). */
  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    scrollCurrentBlankIntoView()
  }, [phase, awaitingRoundAdvance, currentTargetIndex, roundIndex, scrollCurrentBlankIntoView])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  if (typableIndices.length === 0) {
    return (
      <div
        data-tour="memorize-practice-dialog"
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memorize-practice-title"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-600">
          <p className="text-slate-700 dark:text-slate-200">No passage text to practice for this verse.</p>
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
      data-tour="memorize-practice-dialog"
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
          </div>
          <button
            type="button"
            data-tour="memorize-practice-close"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className="relative px-4 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y"
            style={
              keyboardInsetPx > 0
                ? { paddingBottom: `calc(${keyboardInsetPx}px + 0.5rem)` }
                : undefined
            }
          >
          {phase !== 'done' && (
            <input
              ref={practiceInputRef}
              type="text"
              inputMode={currentTargetToken?.kind === 'digit' ? 'numeric' : 'text'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              disabled={phase === 'intro' || awaitingRoundAdvance}
              aria-label="Type the first letter of each blank word, or each digit for number blanks"
              data-testid="memorize-practice-input"
              tabIndex={phase === 'intro' || awaitingRoundAdvance ? -1 : 0}
              className="absolute left-0 top-0 z-0 h-px w-full max-w-full border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
              onKeyDown={handlePracticeInputKeyDown}
              onInput={handlePracticeInput}
            />
          )}
          {phase === 'intro' && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Read the verse and reference, then practice: first letter of each word, each digit separately; colons
                and dashes in the reference are shown and are not typed.
              </p>
              <p
                className="text-base leading-relaxed text-slate-900 dark:text-slate-100 font-serif"
                data-testid="memorize-intro-text"
              >
                {formatMemorizationTokensPlain(tokens)}
              </p>
              <button
                type="button"
                data-tour="memorize-start-practice"
                onClick={() => {
                  completedRef.current = false
                  sessionSeedRef.current = generateMemorizationSessionSeed()
                  startRoundAndFocusInput(1)
                }}
                className="mt-6 w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                Start practice
              </button>
            </div>
          )}

          {phase === 'practicing' && (
            <div>
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
                    ref={hintButtonRef}
                    type="button"
                    data-testid="memorize-hint-button"
                    tabIndex={-1}
                    className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600 active:bg-blue-200 dark:active:bg-blue-900/70 select-none touch-manipulation"
                    aria-pressed={hintActive}
                    aria-label="Hold to peek at hidden words; adds the next word every 3 seconds"
                    title="Hold to peek; next blank every 3s while held"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      setHintPeekCount(1)
                      setHintHeld(true)
                    }}
                    onPointerUp={() => {
                      setHintPeekCount(1)
                      setHintHeld(false)
                      restorePracticeInputFocusAfterHint()
                    }}
                    onPointerLeave={() => {
                      setHintPeekCount(1)
                      setHintHeld(false)
                      restorePracticeInputFocusAfterHint()
                    }}
                    onPointerCancel={() => {
                      setHintPeekCount(1)
                      setHintHeld(false)
                      restorePracticeInputFocusAfterHint()
                    }}
                  >
                    Hint
                  </button>
                )}
              </div>
              {!awaitingRoundAdvance && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {currentTargetIndex !== null &&
                    (currentTargetToken?.kind === 'digit'
                      ? 'Type the next digit (left to right). Colons and dashes in the reference are not typed.'
                      : 'Type the first letter of the next blank (left to right). Hold Hint to peek; another blank appears every 3 seconds while you hold.')}
                  {currentTargetIndex !== null && ' '}
                  Tap the verse or blanks if the keyboard closed.
                </p>
              )}
              <div
                ref={practiceWordsRef}
                role="group"
                aria-label="Verse practice area; tap to show the keyboard again"
                onTouchEnd={() => {
                  if (awaitingRoundAdvance) return
                  requestAnimationFrame(() => {
                    if (document.activeElement !== practiceInputRef.current) {
                      practiceInputRef.current?.focus({ preventScroll: true })
                    }
                  })
                }}
                className={`touch-manipulation cursor-text text-base leading-relaxed font-serif flex flex-wrap gap-x-1 gap-y-2 items-baseline rounded-md p-1 ring-2 ring-inset transition-shadow ${
                  flashError
                    ? 'ring-red-400 dark:ring-red-500'
                    : 'ring-transparent'
                }`}
                data-testid="memorize-practice-words"
              >
                {tokens.map((token, i) => {
                  if (token.kind === 'punct') {
                    return (
                      <span
                        key={`tok-${i}`}
                        className="inline text-slate-900 dark:text-slate-100 whitespace-pre"
                      >
                        {token.text}
                      </span>
                    )
                  }
                  const w = token.text
                  const isHidden = hiddenIndices.has(i)
                  const isRevealed = revealed.has(i)
                  const showViaHint = hintActive && isHidden && !isRevealed && hintPeekIndices.has(i)
                  const showBlankUnderline = isHidden && !isRevealed
                  const isCurrent = showBlankUnderline && i === currentTargetIndex

                  let innerClass = 'text-slate-900 dark:text-slate-100'
                  if (showBlankUnderline) {
                    innerClass = showViaHint
                      ? 'text-blue-800 dark:text-blue-200 italic'
                      : 'text-transparent select-none pointer-events-none'
                  }

                  return (
                    <span
                      key={`tok-${i}`}
                      data-memorize-current-blank={isCurrent ? 'true' : undefined}
                      className={`inline-flex items-baseline border-b-2 box-border px-0.5 min-h-[1.5em] min-w-[0.6em] justify-center ${
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
                  onClick={() => startRoundAndFocusInput(roundIndex)}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Repeat this round
                </button>
                <button
                  type="button"
                  onClick={() => startRoundAndFocusInput(roundIndex + 1)}
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
