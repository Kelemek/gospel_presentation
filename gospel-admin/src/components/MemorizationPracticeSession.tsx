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
import type {
  MemorizationInProgressSavePayload,
  MemorizedVerse,
} from '@/lib/verseMemorizationStorage'
import {
  pickRandomAllDoneMessage,
  pickRandomRoundAffirmation,
} from '@/lib/memorizationEncouragementMessages'
import { scrollMemorizeBlankNearestInPracticeColumn } from '@/lib/memorizationScrollIntoPractice'
import {
  isMemorizeAndroidWebHost,
  isMemorizeIosWebHost,
} from '@/lib/memorizationViewportPlatform'
import { getMemorizationListenUtteranceText } from '@/lib/memorizationListenUtteranceText'
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
  /** Persist multi-round progress (localStorage); do not replace the open `verse` prop on each call to avoid re-hydrating mid-session. */
  onPersistInProgress?: (payload: MemorizationInProgressSavePayload) => void
  /** Clear saved in-progress for this verse (e.g. Start over). */
  onClearInProgress?: () => void
}

type Phase = 'intro' | 'practicing' | 'done'

const MAX_WRONG_BEFORE_REVEAL = 3

/** Extra inset beyond the viewport edge so the current blank sits higher above the soft keyboard. */
const MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX = 48

/** While Hint is held, each tick reveals one more unrevealed blank (left to right). */
const MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS = 1000

/** On Android, clamp the practice column scrollTop to 0 for this many ms after a round starts. */
const ANDROID_SCROLL_CLAMP_MS = 600

/** Gap between end of one read-aloud and the next when "Repeat" is on (ESV and TTS). */
const MEMORIZE_LISTEN_REPEAT_GAP_MS = 650

function expectedKeystrokeForToken(token: MemorizationToken): string {
  if (token.kind === 'digit') return token.text
  if (token.kind === 'word') return firstLetterOfWord(token.text)
  return ''
}

export default function MemorizationPracticeSession({
  verse,
  onClose,
  onComplete,
  onPersistInProgress,
  onClearInProgress,
}: MemorizationPracticeSessionProps) {
  /**
   * `verse.text` is whatever was saved when the verse was added (from `/api/scripture`).
   * API.Bible-backed fetches use `include-titles=false` and a verse-scoped passage id, so
   * section headings are not part of the payload; practice does not need a second pass to strip titles.
   */
  const tokens = useMemo(
    () => buildMemorizationTokens(verse.text, verse.reference),
    [verse.text, verse.reference]
  )
  const typableIndices = useMemo(() => getTypableTokenIndices(tokens), [tokens])
  /** Hide IME field outside the verse scroller so Android does not scrollTo focused input (top of column). */
  const memorizeAndroidHost = useMemo(() => isMemorizeAndroidWebHost(), [])

  const [phase, setPhase] = useState<Phase>('intro')
  const [roundIndex, setRoundIndex] = useState(0)
  const [hasTypedInRound, setHasTypedInRound] = useState(false)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [, setConsecutiveWrong] = useState(0)
  const [wrongAttemptsTotal, setWrongAttemptsTotal] = useState(0)
  const [correctKeystrokesTotal, setCorrectKeystrokesTotal] = useState(0)
  /** Latest totals for persist / onComplete without churning callbacks on every wrong key. */
  const wrongAttemptsRef = useRef(0)
  const correctKeystrokesRef = useRef(0)
  const [flashError, setFlashError] = useState(false)
  const [hintHeld, setHintHeld] = useState(false)
  /** While hint is held: how many unrevealed blanks (left-to-right) to peek, starting at 1; +1 each tick. */
  const [hintPeekCount, setHintPeekCount] = useState(1)
  /** Rounds 1–4: all blanks filled; show Repeat/Next in modal footer without leaving the verse view. */
  const [awaitingRoundAdvance, setAwaitingRoundAdvance] = useState(false)
  const awaitingRoundAdvanceRef = useRef(false)
  const [roundAffirmation, setRoundAffirmation] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const completedRef = useRef(false)
  /** Avoid duplicate advance handling when the completion effect runs twice (e.g. Strict Mode). */
  const roundAdvanceHandledRef = useRef<number | null>(null)
  /** New seed for each time user taps Start practice; reused for rounds/repeat in same session. */
  const sessionSeedRef = useRef<string>('')
  /** Focused during practice so mobile/Capacitor WebView can show the soft keyboard. */
  const practiceInputRef = useRef<HTMLInputElement>(null)
  const assignPracticeInputRef = useCallback((node: HTMLInputElement | null) => {
    practiceInputRef.current = node
  }, [])

  /**
   * ESV: passage-scoped stream via `GET /api/scripture/audio` (Crossway). Other translations:
   * API.Bible only exposes **chapter** MP3s, so we use device TTS to read the saved verse line only.
   */
  const listenViaEsvPassageUrl = verse.translation === 'esv'
  const memorizePassageAudioUrl = useMemo(
    () =>
      `/api/scripture/audio?${new URLSearchParams({
        reference: verse.reference,
        translation: verse.translation,
      }).toString()}`,
    [verse.reference, verse.translation]
  )
  /** ESV uses passage audio on all platforms. Non-ESV Listen is Web TTS — hidden on Android until native TTS is reliable. */
  const introListenControlsVisible = useMemo(
    () => listenViaEsvPassageUrl || !memorizeAndroidHost,
    [listenViaEsvPassageUrl, memorizeAndroidHost]
  )
  const passageAudioRef = useRef<HTMLAudioElement | null>(null)
  const [passageAudioPlaying, setPassageAudioPlaying] = useState(false)
  /** Bumps on speechSynthesis start/end/pause so Listen / Pause / Resume labels re-render. */
  const [listenUiTick, setListenUiTick] = useState(0)
  const bumpListen = useCallback(() => setListenUiTick((n) => n + 1), [])

  /** Shown to the right of Listen after the user uses Listen at least once. */
  const [showRepeatListenButton, setShowRepeatListenButton] = useState(false)
  /** When on, the passage restarts after each play with `MEMORIZE_LISTEN_REPEAT_GAP_MS`. */
  const [repeatListenOn, setRepeatListenOn] = useState(false)
  const repeatListenOnRef = useRef(false)
  const listenRepeatGapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearListenRepeatGapTimer = useCallback(() => {
    if (listenRepeatGapTimerRef.current != null) {
      clearTimeout(listenRepeatGapTimerRef.current)
      listenRepeatGapTimerRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    repeatListenOnRef.current = repeatListenOn
  }, [repeatListenOn])

  const stopPassageAudio = useCallback(() => {
    clearListenRepeatGapTimer()
    repeatListenOnRef.current = false
    setRepeatListenOn(false)
    setShowRepeatListenButton(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    const el = passageAudioRef.current
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    setPassageAudioPlaying(false)
    bumpListen()
  }, [bumpListen, clearListenRepeatGapTimer])

  const listenButtonLabel = useMemo(() => {
    // Subscribes TTS readout to bumpListen() — speechSynthesis is not a React value.
    void listenUiTick
    if (listenViaEsvPassageUrl) {
      return passageAudioPlaying ? 'Pause' : 'Listen'
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return 'Listen'
    }
    const syn = window.speechSynthesis
    if (syn.speaking && syn.paused) return 'Resume'
    if (syn.speaking) return 'Pause'
    return 'Listen'
  }, [listenUiTick, listenViaEsvPassageUrl, passageAudioPlaying])

  const listenAriaPressed = useMemo(() => {
    void listenUiTick
    if (listenViaEsvPassageUrl) {
      return passageAudioPlaying
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false
    }
    const syn = window.speechSynthesis
    return syn.speaking && !syn.paused
  }, [listenUiTick, listenViaEsvPassageUrl, passageAudioPlaying])

  const listenAriaLabel = useMemo(() => {
    if (listenButtonLabel === 'Pause') {
      return 'Pause read-aloud of the passage'
    }
    if (listenButtonLabel === 'Resume') {
      return 'Resume read-aloud of the passage'
    }
    if (listenViaEsvPassageUrl) {
      return 'Listen to the passage read aloud (ESV audio)'
    }
    return 'Listen: read the memorized text aloud using the device (same translation is not available as streaming audio)'
  }, [listenButtonLabel, listenViaEsvPassageUrl])

  useLayoutEffect(() => {
    wrongAttemptsRef.current = wrongAttemptsTotal
    correctKeystrokesRef.current = correctKeystrokesTotal
    awaitingRoundAdvanceRef.current = awaitingRoundAdvance
  }, [wrongAttemptsTotal, correctKeystrokesTotal, awaitingRoundAdvance])
  /**
   * On Android, Chrome scrolls the overflow column during the keyboard-open animation,
   * overriding our scrollTop=0. This timestamp lets a scroll-event listener clamp the
   * column to 0 for ANDROID_SCROLL_CLAMP_MS after a round starts or resumes.
   */
  const androidScrollClampUntilRef = useRef(0)
  /** If keydown already handled a letter, skip the matching input event (avoids double counts). */
  const suppressInputFromKeydownRef = useRef(false)
  const practiceScrollRef = useRef<HTMLDivElement>(null)
  const practiceWordsRef = useRef<HTMLDivElement>(null)
  /** Distinguish verse tap (refocus keyboard) from vertical scroll — movement past threshold = scroll. */
  const verseTouchMovedRef = useRef(false)
  const verseTouchStartRef = useRef({ x: 0, y: 0 })
  const hintButtonRef = useRef<HTMLButtonElement>(null)
  /** Extra bottom padding when the on-screen keyboard shrinks visualViewport (mobile / Capacitor). */
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0)

  /** One resume hydrate per dialog open / verse id (avoid re-applying when parent refreshes list only). */
  const openedLayoutOnceForVerseIdRef = useRef<string | null>(null)
  const lastVerseIdForLayoutRef = useRef(verse.id)

  useEffect(() => {
    if (verse.inProgressPractice) {
      completedRef.current = false
      return
    }
    completedRef.current = false
    roundAdvanceHandledRef.current = null
    startTransition(() => {
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setCompletionMessage('')
    })
    sessionSeedRef.current = ''
    startTransition(() => {
      setPhase('intro')
      setRoundIndex(0)
      setHasTypedInRound(false)
      setHiddenIndices(new Set())
      setRevealed(new Set())
      setWrongAttemptsTotal(0)
      setCorrectKeystrokesTotal(0)
    })
  }, [verse.id, verse.inProgressPractice])

  const lastAudioResetVerseIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (lastAudioResetVerseIdRef.current === null) {
      lastAudioResetVerseIdRef.current = verse.id
      return
    }
    if (lastAudioResetVerseIdRef.current === verse.id) {
      return
    }
    lastAudioResetVerseIdRef.current = verse.id
    stopPassageAudio()
  }, [verse.id, stopPassageAudio])

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
    const coalesceAndroid = isMemorizeAndroidWebHost()
    let insetRaf = 0
    const applyInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInsetPx(inset)
    }
    const updateInset = () => {
      if (!coalesceAndroid) {
        applyInset()
        return
      }
      if (insetRaf) return
      insetRaf = window.requestAnimationFrame(() => {
        insetRaf = 0
        applyInset()
      })
    }
    applyInset()
    vv.addEventListener('resize', updateInset)
    vv.addEventListener('scroll', updateInset)
    return () => {
      if (insetRaf) window.cancelAnimationFrame(insetRaf)
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
    }, MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS)
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

  useEffect(() => {
    if (!memorizeAndroidHost || phase !== 'practicing') return
    const scrollEl = practiceScrollRef.current
    if (!scrollEl) return
    const onScroll = () => {
      if (Date.now() < androidScrollClampUntilRef.current) {
        scrollEl.scrollTop = 0
      }
    }
    scrollEl.addEventListener('scroll', onScroll, { passive: false })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [memorizeAndroidHost, phase])

  const startRound = useCallback(
    (r: number) => {
      roundAdvanceHandledRef.current = null
      const seed = sessionSeedRef.current || verse.id
      const localHidden = pickHiddenWordIndices(typableIndices.length, r, seed)
      const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
      if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
      setRoundIndex(r)
      setHasTypedInRound(false)
      setHiddenIndices(hidden)
      setRevealed(new Set())
      setConsecutiveWrong(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setPhase('practicing')
    },
    [memorizeAndroidHost, typableIndices, verse.id]
  )

  useLayoutEffect(() => {
    if (lastVerseIdForLayoutRef.current !== verse.id) {
      lastVerseIdForLayoutRef.current = verse.id
      openedLayoutOnceForVerseIdRef.current = null
    }
    if (openedLayoutOnceForVerseIdRef.current === verse.id) return
    openedLayoutOnceForVerseIdRef.current = verse.id

    const ip = verse.inProgressPractice
    if (!ip) return

    sessionSeedRef.current = ip.sessionSeed
    completedRef.current = false

    if (ip.phase.kind === 'betweenRounds') {
      const r = ip.phase.completedRoundIndex
      roundAdvanceHandledRef.current = r
      const seed = sessionSeedRef.current
      const localHidden = pickHiddenWordIndices(typableIndices.length, r, seed)
      const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
      startTransition(() => {
        setWrongAttemptsTotal(ip.wrongAttempts)
        setCorrectKeystrokesTotal(ip.correctKeystrokes)
        setRoundIndex(r)
        setHasTypedInRound(false)
        setHiddenIndices(hidden)
        setRevealed(new Set(hidden))
        setConsecutiveWrong(0)
        setAwaitingRoundAdvance(true)
        setRoundAffirmation(pickRandomRoundAffirmation())
        setPhase('practicing')
      })
    } else {
      roundAdvanceHandledRef.current = null
      const r = ip.phase.roundIndex
      const localHidden = pickHiddenWordIndices(typableIndices.length, r, sessionSeedRef.current)
      const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
      if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
      startTransition(() => {
        setWrongAttemptsTotal(ip.wrongAttempts)
        setCorrectKeystrokesTotal(ip.correctKeystrokes)
        setRoundIndex(r)
        setHasTypedInRound(false)
        setHiddenIndices(hidden)
        setRevealed(new Set())
        setConsecutiveWrong(0)
        setAwaitingRoundAdvance(false)
        setRoundAffirmation('')
        setPhase('practicing')
      })
    }
    requestAnimationFrame(() => {
      if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      practiceInputRef.current?.focus({ preventScroll: true })
    })
  }, [memorizeAndroidHost, verse.id, verse.inProgressPractice, typableIndices])

  /**
   * Scroll the active blank only as needed in the practice column (same min-scroll path as Android),
   * then nudge using `visualViewport` so the blank stays above the soft keyboard. We avoid
   * `scrollIntoView({ block: 'center' })` on iOS: it centers in the scroll box and ignores the keyboard,
   * so the viewport nudge then scrolls the other way — a visible down-then-up. Android already used
   * min-scroll + instant nudge + double measure to avoid IME jitter; iOS now matches the instant nudge.
   */
  const scrollCurrentBlankIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const root = practiceWordsRef.current
      const scrollEl = practiceScrollRef.current
      if (!root || !scrollEl) return
      const el = root.querySelector<HTMLElement>('[data-memorize-current-blank="true"]')
      if (!el) return
      const androidHost = isMemorizeAndroidWebHost()
      if (androidHost) {
        if (Date.now() < androidScrollClampUntilRef.current) {
          scrollEl.scrollTop = 0
          return
        }
      }
      scrollMemorizeBlankNearestInPracticeColumn(scrollEl, el)
      const vv = window.visualViewport
      if (!vv) return
      const edgeMargin = 12
      const viewTop = vv.offsetTop + edgeMargin
      const viewBottom =
        vv.offsetTop + vv.height - edgeMargin - MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const nudgeBehavior: ScrollBehavior =
        reduceMotion || androidHost || isMemorizeIosWebHost() ? 'auto' : 'smooth'
      const nudgeIntoVisibleViewport = () => {
        const rect = el.getBoundingClientRect()
        let delta = 0
        if (rect.bottom > viewBottom) delta += rect.bottom - viewBottom
        if (rect.top < viewTop) delta -= viewTop - rect.top
        if (Math.abs(delta) < 0.5) return
        const nextTop = Math.max(0, scrollEl.scrollTop + delta)
        scrollEl.scrollTo({ top: nextTop, behavior: nudgeBehavior })
      }
      nudgeIntoVisibleViewport()
      if (nudgeBehavior === 'auto') {
        requestAnimationFrame(nudgeIntoVisibleViewport)
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
   * Verse area:
   * - When the hidden input is focused (keyboard up), touchstart + preventDefault stops iOS from blurring it on tap.
   *   That blocks starting a scroll gesture *on the verse* while focused; scroll from the instruction area above or
   *   tap outside to dismiss first if needed.
   * - When not focused, no preventDefault so the panel can scroll; touchend refocuses after a tap (see verse div).
   * - Mouse/pen: pointerdown capture keeps focus when tapping the verse.
   */
  useLayoutEffect(() => {
    if (phase !== 'practicing') return
    const el = practiceWordsRef.current
    if (!el) return
    const onTouchStartCaptureVerse = (e: TouchEvent) => {
      if (awaitingRoundAdvanceRef.current) return
      const input = practiceInputRef.current
      if (!input) return
      if (document.activeElement === input) {
        e.preventDefault()
      }
    }
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      keepPracticeInputOnPointerCapture(e)
    }
    el.addEventListener('touchstart', onTouchStartCaptureVerse, { capture: true, passive: false })
    el.addEventListener('pointerdown', onPointerDownCapture, { capture: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStartCaptureVerse, { capture: true })
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
      if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      practiceInputRef.current?.focus({ preventScroll: true })
    },
    [startRound]
  )

  const persistPracticeSnapshot = useCallback(
    (phasePayload: MemorizationInProgressSavePayload['phase']) => {
      if (!onPersistInProgress || !sessionSeedRef.current) return
      onPersistInProgress({
        sessionSeed: sessionSeedRef.current,
        wrongAttempts: wrongAttemptsRef.current,
        correctKeystrokes: correctKeystrokesRef.current,
        phase: phasePayload,
      })
    },
    [onPersistInProgress]
  )

  const handleClose = useCallback(() => {
    stopPassageAudio()
    if (onPersistInProgress && sessionSeedRef.current && phase === 'practicing') {
      if (awaitingRoundAdvance) {
        persistPracticeSnapshot({ kind: 'betweenRounds', completedRoundIndex: roundIndex })
      } else {
        persistPracticeSnapshot({ kind: 'inRound', roundIndex })
      }
    }
    onClose()
  }, [
    onClose,
    onPersistInProgress,
    phase,
    awaitingRoundAdvance,
    roundIndex,
    persistPracticeSnapshot,
    stopPassageAudio,
  ])

  const handleStartOver = useCallback(() => {
    stopPassageAudio()
    onClearInProgress?.()
    sessionSeedRef.current = ''
    completedRef.current = false
    roundAdvanceHandledRef.current = null
    openedLayoutOnceForVerseIdRef.current = null
    lastVerseIdForLayoutRef.current = verse.id
    startTransition(() => {
      setPhase('intro')
      setRoundIndex(0)
      setHasTypedInRound(false)
      setHiddenIndices(new Set())
      setRevealed(new Set())
      setWrongAttemptsTotal(0)
      setCorrectKeystrokesTotal(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setCompletionMessage('')
    })
  }, [verse.id, onClearInProgress, stopPassageAudio])

  useEffect(() => {
    if (phase !== 'intro') {
      stopPassageAudio()
    }
  }, [phase, stopPassageAudio])

  const handlePassageAudioPlay = useCallback(() => {
    setShowRepeatListenButton(true)
    setPassageAudioPlaying(true)
  }, [])

  const handlePassageAudioPause = useCallback(() => {
    setPassageAudioPlaying(false)
  }, [])

  const handlePassageAudioEnded = useCallback(() => {
    setPassageAudioPlaying(false)
    bumpListen()
    if (!repeatListenOnRef.current) {
      return
    }
    clearListenRepeatGapTimer()
    listenRepeatGapTimerRef.current = setTimeout(() => {
      listenRepeatGapTimerRef.current = null
      if (!repeatListenOnRef.current) {
        return
      }
      const el = passageAudioRef.current
      if (!el) {
        return
      }
      el.currentTime = 0
      void el.play().catch(() => {
        setPassageAudioPlaying(false)
        bumpListen()
      })
    }, MEMORIZE_LISTEN_REPEAT_GAP_MS)
  }, [bumpListen, clearListenRepeatGapTimer])

  const beginTtsUtterance = useCallback(function speakTtsLine() {
    if (memorizeAndroidHost) {
      return
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }
    const text = getMemorizationListenUtteranceText(verse)
    if (!text.trim()) {
      return
    }
    const syn = window.speechSynthesis
    syn.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.onstart = () => {
      setShowRepeatListenButton(true)
      bumpListen()
    }
    u.onend = () => {
      bumpListen()
      if (!repeatListenOnRef.current) {
        return
      }
      clearListenRepeatGapTimer()
      listenRepeatGapTimerRef.current = setTimeout(() => {
        listenRepeatGapTimerRef.current = null
        if (!repeatListenOnRef.current) {
          return
        }
        speakTtsLine()
      }, MEMORIZE_LISTEN_REPEAT_GAP_MS)
    }
    u.onerror = () => {
      bumpListen()
    }
    syn.speak(u)
    bumpListen()
  }, [bumpListen, clearListenRepeatGapTimer, memorizeAndroidHost, verse])

  const handleListenPassageClick = useCallback(() => {
    if (!introListenControlsVisible) {
      return
    }
    setShowRepeatListenButton(true)
    if (listenViaEsvPassageUrl) {
      const el = passageAudioRef.current
      if (!el) return
      if (!el.paused) {
        el.pause()
        return
      }
      void (async () => {
        try {
          el.src = memorizePassageAudioUrl
          await el.play()
        } catch {
          setPassageAudioPlaying(false)
        }
      })()
      return
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }
    const syn = window.speechSynthesis
    if (syn.speaking) {
      if (syn.paused) {
        syn.resume()
      } else {
        syn.pause()
      }
      bumpListen()
      return
    }
    beginTtsUtterance()
  }, [
    beginTtsUtterance,
    bumpListen,
    introListenControlsVisible,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
  ])

  const handleRepeatListenToggle = useCallback(() => {
    if (!introListenControlsVisible) {
      return
    }
    if (!showRepeatListenButton) {
      return
    }
    const next = !repeatListenOnRef.current
    repeatListenOnRef.current = next
    setRepeatListenOn(next)
    if (next) {
      if (listenViaEsvPassageUrl) {
        const el = passageAudioRef.current
        if (el?.paused) {
          void (async () => {
            try {
              el.src = memorizePassageAudioUrl
              el.currentTime = 0
              await el.play()
            } catch {
              setPassageAudioPlaying(false)
              bumpListen()
            }
          })()
        }
        return
      }
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return
      }
      if (!window.speechSynthesis.speaking) {
        beginTtsUtterance()
      }
    } else {
      clearListenRepeatGapTimer()
    }
  }, [
    beginTtsUtterance,
    bumpListen,
    clearListenRepeatGapTimer,
    introListenControlsVisible,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
    showRepeatListenButton,
  ])

  useEffect(() => {
    if (phase !== 'practicing' || hiddenIndices.size === 0) return
    const allDone = [...hiddenIndices].every((i) => revealed.has(i))
    if (!allDone) return
    if (roundIndex >= MEMORIZATION_FULL_HIDE_ROUND) {
      if (completedRef.current) return
      completedRef.current = true
      onComplete({
        wrongAttempts: wrongAttemptsRef.current,
        correctKeystrokes: correctKeystrokesRef.current,
        completed: true,
      })
      startTransition(() => {
        setCompletionMessage(pickRandomAllDoneMessage())
        setPhase('done')
      })
    } else {
      if (roundAdvanceHandledRef.current === roundIndex) return
      roundAdvanceHandledRef.current = roundIndex
      if (onPersistInProgress && sessionSeedRef.current) {
        persistPracticeSnapshot({ kind: 'betweenRounds', completedRoundIndex: roundIndex })
      }
      startTransition(() => {
        setRoundAffirmation(pickRandomRoundAffirmation())
        setAwaitingRoundAdvance(true)
      })
    }
  }, [phase, hiddenIndices, revealed, roundIndex, onComplete, onPersistInProgress, persistPracticeSnapshot])

  const processKeystroke = useCallback(
    (key: string) => {
      if (hintActive) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (key.length !== 1) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return

      setHasTypedInRound(true)

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
      if (hasTypedInRound) scrollCurrentBlankIntoView()
    }, 0)
    return () => window.clearTimeout(id)
  }, [phase, awaitingRoundAdvance, roundIndex, currentTargetIndex, hintActive, hasTypedInRound, scrollCurrentBlankIntoView])

  /** Keep the active blank centered as you advance (and after round changes). */
  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    if (!hasTypedInRound) return
    scrollCurrentBlankIntoView()
  }, [phase, awaitingRoundAdvance, currentTargetIndex, roundIndex, hasTypedInRound, scrollCurrentBlankIntoView])

  /** When the keyboard resizes the visual viewport, re-nudge so the current blank stays above it. */
  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    if (!hasTypedInRound) return
    const delayMs = isMemorizeAndroidWebHost() ? 120 : 80
    const id = window.setTimeout(() => scrollCurrentBlankIntoView(), delayMs)
    return () => window.clearTimeout(id)
  }, [
    keyboardInsetPx,
    phase,
    awaitingRoundAdvance,
    currentTargetIndex,
    hasTypedInRound,
    scrollCurrentBlankIntoView,
  ])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [handleClose])

  const showStartOver =
    typeof onClearInProgress === 'function' &&
    (phase === 'practicing' || (phase === 'intro' && !!verse.inProgressPractice))

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
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-600 shrink-0">
          <h2 id="memorize-practice-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100 min-w-0">
            Memorize
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {showStartOver && (
              <button
                type="button"
                data-testid="memorize-start-over"
                onClick={handleStartOver}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Start over
              </button>
            )}
            {phase === 'practicing' && !awaitingRoundAdvance && (
              <button
                ref={hintButtonRef}
                type="button"
                data-testid="memorize-hint-button"
                tabIndex={-1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600 active:bg-blue-200 dark:active:bg-blue-900/70 select-none touch-manipulation"
                aria-pressed={hintActive}
                aria-label="Hold to peek at hidden words; adds the next word every second"
                title="Hold to peek; next blank every 1s while held"
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
            <button
              type="button"
              data-tour="memorize-practice-close"
              onClick={handleClose}
              className="text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {phase !== 'done' && memorizeAndroidHost && (
            <input
              ref={assignPracticeInputRef}
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
              className="pointer-events-none fixed top-[25vh] left-1/2 z-110 h-10 w-32 max-w-[min(12rem,45vw)] -translate-x-1/2 border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
              onKeyDown={handlePracticeInputKeyDown}
              onInput={handlePracticeInput}
            />
          )}
          <div
            ref={practiceScrollRef}
            className="relative px-4 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y"
            style={
              keyboardInsetPx > 0
                ? { paddingBottom: `calc(${keyboardInsetPx}px + 0.5rem)` }
                : undefined
            }
          >
          {phase !== 'done' && !memorizeAndroidHost && (
            <input
              ref={assignPracticeInputRef}
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
              {listenViaEsvPassageUrl && (
                <audio
                  ref={passageAudioRef}
                  preload="none"
                  className="hidden"
                  aria-hidden
                  onPlay={handlePassageAudioPlay}
                  onPause={handlePassageAudioPause}
                  onEnded={handlePassageAudioEnded}
                  onError={() => {
                    setPassageAudioPlaying(false)
                  }}
                />
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-tour="memorize-start-practice"
                  onClick={() => {
                    completedRef.current = false
                    sessionSeedRef.current = generateMemorizationSessionSeed()
                    startRoundAndFocusInput(1)
                    onPersistInProgress?.({
                      sessionSeed: sessionSeedRef.current,
                      wrongAttempts: 0,
                      correctKeystrokes: 0,
                      phase: { kind: 'inRound', roundIndex: 1 },
                    })
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  Start practice
                </button>
                {introListenControlsVisible && (
                  <>
                    <button
                      type="button"
                      data-testid="memorize-listen-passage"
                      onClick={() => {
                        handleListenPassageClick()
                      }}
                      className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
                      aria-pressed={listenAriaPressed}
                      aria-label={listenAriaLabel}
                    >
                      {listenButtonLabel}
                    </button>
                    {showRepeatListenButton && (
                      <button
                        type="button"
                        data-testid="memorize-listen-repeat"
                        onClick={handleRepeatListenToggle}
                        className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 data-[on=true]:bg-amber-50 data-[on=true]:dark:bg-amber-900/20 data-[on=true]:border-amber-300 data-[on=true]:dark:border-amber-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
                        data-on={repeatListenOn ? 'true' : 'false'}
                        aria-pressed={repeatListenOn}
                        aria-label={
                          repeatListenOn
                            ? 'Stop repeating the read-aloud after this play ends'
                            : 'Repeat the read-aloud with a short pause between each play'
                        }
                      >
                        {repeatListenOn ? 'Repeat on' : 'Repeat'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {phase === 'practicing' && (
            <div>
              <div className="mb-2">
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
              </div>
              {!awaitingRoundAdvance && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {currentTargetIndex !== null &&
                    (currentTargetToken?.kind === 'digit'
                      ? 'Type the next digit (left to right). Colons and dashes in the reference are not typed.'
                      : 'Type the first letter of the next blank (left to right). Hold Hint to peek; another blank appears every second while you hold.')}
                  {currentTargetIndex !== null && ' '}
                  Tap the verse or blanks if the keyboard closed.
                </p>
              )}
              <div
                ref={practiceWordsRef}
                role="group"
                aria-label="Verse practice area; tap to show the keyboard again"
                onTouchStart={(e) => {
                  verseTouchMovedRef.current = false
                  const t = e.touches[0]
                  if (t) verseTouchStartRef.current = { x: t.clientX, y: t.clientY }
                }}
                onTouchMove={(e) => {
                  const t = e.touches[0]
                  if (!t) return
                  const dx = t.clientX - verseTouchStartRef.current.x
                  const dy = t.clientY - verseTouchStartRef.current.y
                  if (dx * dx + dy * dy > 144) verseTouchMovedRef.current = true
                }}
                onTouchCancel={() => {
                  verseTouchMovedRef.current = false
                }}
                onTouchEnd={() => {
                  if (awaitingRoundAdvance) return
                  const wasScroll = verseTouchMovedRef.current
                  verseTouchMovedRef.current = false
                  if (wasScroll) return
                  // iOS/Capacitor: focus() must run in the touch handler, not rAF, or the keyboard won't open.
                  const input = practiceInputRef.current
                  if (!input) return
                  input.focus({ preventScroll: true })
                  window.setTimeout(() => {
                    if (document.activeElement !== input) input.focus({ preventScroll: true })
                  }, 0)
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
                  onClick={() => {
                    persistPracticeSnapshot({ kind: 'inRound', roundIndex })
                    startRoundAndFocusInput(roundIndex)
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Repeat this round
                </button>
                <button
                  type="button"
                  onClick={() => {
                    persistPracticeSnapshot({ kind: 'inRound', roundIndex: roundIndex + 1 })
                    startRoundAndFocusInput(roundIndex + 1)
                  }}
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
