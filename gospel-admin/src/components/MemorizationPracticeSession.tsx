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
import { Capacitor } from '@capacitor/core'
import {
  isMemorizeSpeechAvailable,
  isMemorizeSpeechPluginInNativeBuild,
  requestMemorizeSpeechPermissions,
  startVoicePtt,
} from '@/lib/memorizeNativeSpeech'
import {
  processWordsForVoiceHold,
  tokenizeTranscriptToWords,
  type VoiceHoldProcessResult,
} from '@/lib/memorizationVoiceMatching'
import {
  newSpokenWordTokensAfterPrefix,
  processWordsForVoiceHoldBestAfterDiverge,
  selectBestTranscriptForVoiceMatch,
} from '@/lib/voiceTranscriptReconcile'
import type {
  MemorizationInProgress,
  MemorizationInProgressSavePayload,
  MemorizationPracticeKind,
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
import logger from '@/lib/logger'

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

function expectedKeystrokeForToken(
  token: MemorizationToken,
  /** For multi-digit reference tokens, index of the next key (0 = first). */
  digitTypeCharIndex: number
): string {
  if (token.kind === 'digit') {
    if (token.text.length <= 1) return token.text
    return token.text[digitTypeCharIndex] ?? ''
  }
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
  const isNative = useMemo(() => Capacitor.isNativePlatform(), [])
  const capPlatform = useMemo(() => Capacitor.getPlatform(), [])
  const [introView, setIntroView] = useState<'pick' | 'typing' | 'voice'>('pick')
  const [activePracticeMode, setActivePracticeMode] = useState<MemorizationPracticeKind | null>(null)
  const [nativeSpeechAvailable, setNativeSpeechAvailable] = useState(false)
  /** When false on native, the Capacitor app was not rebuilt after adding the speech plugin (`npx cap sync` + install). */
  const speechPluginInBuild = useMemo(() => isMemorizeSpeechPluginInNativeBuild(), [])
  /** True while requesting speech/mic so iOS can show system prompts (must run in a user gesture, not on mount). */
  const [voiceGateBusy, setVoiceGateBusy] = useState(false)
  const [voiceTypableOffset, setVoiceTypableOffset] = useState(0)
  const [voiceConsecWrong, setVoiceConsecWrong] = useState(0)
  const pttAtDownRef = useRef(0)
  const lastVoiceTranscriptRef = useRef('')
  /** Longest trim() seen this PTT; continuous STT can briefly send a short partial after a segment restart. */
  const pttTranscriptLongestRef = useRef('')
  const lastVoiceTranscriptProcessedRef = useRef('')
  /** Last tokenize(effective) for incremental voice matching; reset each PTT. */
  const lastVoicePartialTokensRef = useRef<string[] | null>(null)
  const pendingVoiceApplyEffectiveTRef = useRef('')
  /** Refreshed every render: native PTT can invoke the transcript handler off React’s render cycle, so the handler must not close over stale tokens/hidden indices. */
  const voicePttStateRef = useRef({
    tokens: [] as MemorizationToken[],
    typableIndices: [] as number[],
    hiddenIndices: new Set<number>() as Set<number>,
    isVoiceMode: false,
    phase: 'intro' as Phase,
  })
  const pttControllerRef = useRef<Awaited<ReturnType<typeof startVoicePtt>> | null>(null)
  /** Prevents overlapping start() while awaiting permissions (native: "Speech recognition is already running"). */
  const pttStartInFlightRef = useRef(false)
  /** Each `stopVoicePttSession` call bumps this so a deferred final-flush from an older stop does not run after a newer one (e.g. new round / skip). */
  const voicePttStopGenerationRef = useRef(0)
  const [pttListening, setPttListening] = useState(false)
  const voiceOffsetRef = useRef(0)
  const voiceConsecWrongRef = useRef(0)
  /** Keep in sync in render so speech callbacks and PTT see the current step. */
  voiceOffsetRef.current = voiceTypableOffset
  voiceConsecWrongRef.current = voiceConsecWrong

  /** Hide IME field outside the verse scroller so Android does not scrollTo focused input (top of column). */
  const memorizeAndroidHost = useMemo(() => isMemorizeAndroidWebHost(), [])
  const isVoiceMode = activePracticeMode === 'voice'
  const isTypingPractice = activePracticeMode === 'typing'

  const [phase, setPhase] = useState<Phase>('intro')
  const showMemorizeTypingInputs =
    phase !== 'done' &&
    ((isTypingPractice && phase === 'practicing') || (phase === 'intro' && introView === 'typing'))
  const [roundIndex, setRoundIndex] = useState(0)
  const [hasTypedInRound, setHasTypedInRound] = useState(false)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  /** Next character index when the current target is a multi-digit number (reference). */
  const [digitTypeCharIndex, setDigitTypeCharIndex] = useState(0)
  const [, setConsecutiveWrong] = useState(0)
  const [wrongAttemptsTotal, setWrongAttemptsTotal] = useState(0)
  const [correctKeystrokesTotal, setCorrectKeystrokesTotal] = useState(0)
  /** Latest totals for persist / onComplete without churning callbacks on every wrong key. */
  const wrongAttemptsRef = useRef(0)
  const correctKeystrokesRef = useRef(0)
  const [hintHeld, setHintHeld] = useState(false)
  /**
   * Updated synchronously in hint pointer handlers. Voice callbacks read this so release is visible
   * before the next `hintHeld` state commit (which fixed voice stuck after hint).
   */
  const hintHeldRef = useRef(false)
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
  /** Saved in-progress (if any) until the user picks mode and taps Start; avoids auto-resuming into practice. */
  const stashedInProgressRef = useRef<MemorizationInProgress | null>(null)
  /**
   * `onClearInProgress` may commit before the replacement `onPersist` (mode switch in beginOrResume). Without this,
   * the effect that resets when `!verse.inProgressPractice` would snap back to the type/voice pick for one frame/turn.
   */
  const skipIntroFullResetOnInProgressClearedRef = useRef(false)

  useEffect(() => {
    if (isNative) {
      isMemorizeSpeechAvailable().then(setNativeSpeechAvailable)
    }
  }, [isNative])

  /**
   * Voice was gated on `isMemorizeSpeechAvailable()` from mount, but iOS only shows the speech/mic prompts after
   * `requestPermissions()` in a user gesture. Request first, then re-check availability.
   */
  const ensureMemorizeVoiceReady = useCallback(async (): Promise<boolean> => {
    if (!speechPluginInBuild) return false
    if (nativeSpeechAvailable) return true
    const granted = await requestMemorizeSpeechPermissions()
    const avail = await isMemorizeSpeechAvailable()
    setNativeSpeechAvailable(avail)
    return granted && avail
  }, [speechPluginInBuild, nativeSpeechAvailable])

  useEffect(() => {
    if (verse.inProgressPractice) {
      completedRef.current = false
      return
    }
    if (skipIntroFullResetOnInProgressClearedRef.current) {
      skipIntroFullResetOnInProgressClearedRef.current = false
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
    stashedInProgressRef.current = null
    startTransition(() => {
      setPhase('intro')
      setRoundIndex(0)
      setHasTypedInRound(false)
      setHiddenIndices(new Set())
      setRevealed(new Set())
      setWrongAttemptsTotal(0)
      setCorrectKeystrokesTotal(0)
      setIntroView('pick')
      setActivePracticeMode(null)
      setVoiceTypableOffset(0)
      setVoiceConsecWrong(0)
    })
  }, [verse.id, verse.inProgressPractice])

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

  /** Raw pointer state; use hintActive for UI (typing input, aria). Voice uses `hintHeldRef` for gating. */
  const hintActive =
    hintHeld &&
    phase === 'practicing' &&
    !awaitingRoundAdvance &&
    (isTypingPractice || isVoiceMode)

  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance) {
      hintHeldRef.current = false
    }
  }, [phase, awaitingRoundAdvance])

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
      setHintPeekCount(1)
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
    setDigitTypeCharIndex(0)
  }, [currentTargetIndex, roundIndex])

  const voiceHighlightIndex = useMemo((): number | null => {
    if (!isVoiceMode || typableIndices.length === 0) return null
    if (voiceTypableOffset < 0 || voiceTypableOffset >= typableIndices.length) return null
    return typableIndices[voiceTypableOffset]!
  }, [isVoiceMode, typableIndices, voiceTypableOffset])

  /** Token indices already covered in this round (the next to speak is at `voiceHighlightIndex`). */
  const voiceSpokenTokenIndices = useMemo(() => {
    if (!isVoiceMode) return new Set<number>()
    const s = new Set<number>()
    for (let step = 0; step < voiceTypableOffset; step += 1) {
      s.add(typableIndices[step]!)
    }
    return s
  }, [isVoiceMode, typableIndices, voiceTypableOffset])

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

  const applyMemorizeVoiceTranscript = useCallback(
    (effectiveT: string, opts?: { flushSessionLine?: boolean }) => {
      if (hintHeldRef.current) return
      const { tokens: tks, typableIndices: ti, hiddenIndices: hi, isVoiceMode: voice, phase: ph } =
        voicePttStateRef.current
      if (!voice || ph !== 'practicing' || awaitingRoundAdvanceRef.current) {
        return
      }
      if (!effectiveT) {
        return
      }
      const flush = opts?.flushSessionLine === true
      if (!flush && effectiveT === lastVoiceTranscriptProcessedRef.current) {
        return
      }
      const words = tokenizeTranscriptToWords(effectiveT)
      const baseHold = {
        tokens: tks,
        typableIndices: ti,
        hiddenIndices: hi,
        consecutiveWrong: voiceConsecWrongRef.current,
      }
      const startStep = voiceOffsetRef.current
      let r: VoiceHoldProcessResult

      if (flush) {
        lastVoiceTranscriptProcessedRef.current = effectiveT
        lastVoiceTranscriptRef.current = effectiveT
        r = processWordsForVoiceHoldBestAfterDiverge(
          baseHold,
          words,
          pttAtDownRef.current,
          voiceOffsetRef.current
        )
        lastVoicePartialTokensRef.current = null
      } else {
        const delta = newSpokenWordTokensAfterPrefix(lastVoicePartialTokensRef.current, words)
        if (!delta.shouldProcess) {
          lastVoicePartialTokensRef.current = delta.storePrevious
          lastVoiceTranscriptProcessedRef.current = effectiveT
          return
        }
        lastVoiceTranscriptProcessedRef.current = effectiveT
        lastVoiceTranscriptRef.current = effectiveT
        if (delta.kind === 'all' && delta.allReason === 'diverged') {
          r = processWordsForVoiceHoldBestAfterDiverge(
            baseHold,
            words,
            pttAtDownRef.current,
            voiceOffsetRef.current
          )
        } else {
          r = processWordsForVoiceHold({
            ...baseHold,
            pttStartStep: voiceOffsetRef.current,
            spokenWords: [...delta.newWords],
          })
        }
      }
      // Next partial’s LCP is against the full line STT has so far.
      lastVoicePartialTokensRef.current = words
      const wouldRegress = r.nextStep < startStep
      if (wouldRegress) {
        setVoiceTypableOffset((prev) => Math.max(prev, r.nextStep))
        return
      }
      if (r.correctKeystrokesDelta > 0) {
        setHasTypedInRound(true)
      }
      if (r.wrongAttemptsDelta > 0) {
        setWrongAttemptsTotal((w) => w + r.wrongAttemptsDelta)
      }
      if (r.correctKeystrokesDelta > 0) {
        setCorrectKeystrokesTotal((c) => c + r.correctKeystrokesDelta)
      }
      if (r.revealedToAdd.length > 0) {
        setRevealed((prev) => {
          const next = new Set(prev)
          for (const idx of r.revealedToAdd) next.add(idx)
          return next
        })
      }
      setVoiceTypableOffset((prev) => Math.max(prev, r.nextStep))
      setVoiceConsecWrong(r.nextConsecutiveWrong)
      voiceConsecWrongRef.current = r.nextConsecutiveWrong
    },
    []
  )

  const stopVoicePttSession = useCallback(
    (opts?: { skipDeferredFlush?: boolean }) => {
      const skipDeferred = opts?.skipDeferredFlush === true
      const thisStopGen = (voicePttStopGenerationRef.current += 1)
      pttStartInFlightRef.current = false
      setPttListening(false)
      const c = pttControllerRef.current
      pttControllerRef.current = null
      const clearPttTextRefs = () => {
        pttTranscriptLongestRef.current = ''
        lastVoiceTranscriptProcessedRef.current = ''
        lastVoicePartialTokensRef.current = null
        pendingVoiceApplyEffectiveTRef.current = ''
      }
      void (async () => {
        if (c) {
          try {
            await c.stop()
          } catch {
            // empty
          }
        }
        if (skipDeferred) {
          clearPttTextRefs()
          return
        }
        // getLastPartialResult is often empty after stop; still re-apply longest line once (idempotent if already applied).
        await new Promise((r) => {
          window.setTimeout(r, 0)
        })
        if (thisStopGen !== voicePttStopGenerationRef.current) {
          clearPttTextRefs()
          return
        }
        const longest = pttTranscriptLongestRef.current
        if (longest) {
          lastVoiceTranscriptProcessedRef.current = ''
          applyMemorizeVoiceTranscript(longest, { flushSessionLine: true })
        }
        clearPttTextRefs()
      })()
    },
    [applyMemorizeVoiceTranscript]
  )

  const startRound = useCallback(
    (r: number) => {
      stopVoicePttSession({ skipDeferredFlush: true })
      roundAdvanceHandledRef.current = null
      /** Match React state immediately so PTT / persist never see the previous round’s end offset. */
      voiceOffsetRef.current = 0
      voiceConsecWrongRef.current = 0
      const seed = sessionSeedRef.current || verse.id
      const localHidden = pickHiddenWordIndices(typableIndices.length, r, seed)
      const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
      if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
      setRoundIndex(r)
      setHasTypedInRound(false)
      setHiddenIndices(hidden)
      setRevealed(new Set())
      setConsecutiveWrong(0)
      setVoiceTypableOffset(0)
      setVoiceConsecWrong(0)
      setDigitTypeCharIndex(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setPhase('practicing')
    },
    [memorizeAndroidHost, stopVoicePttSession, typableIndices, verse.id]
  )

  useLayoutEffect(() => {
    if (lastVerseIdForLayoutRef.current !== verse.id) {
      lastVerseIdForLayoutRef.current = verse.id
      openedLayoutOnceForVerseIdRef.current = null
    }
    if (openedLayoutOnceForVerseIdRef.current === verse.id) return

    const ip = verse.inProgressPractice
    if (!ip) {
      stashedInProgressRef.current = null
      openedLayoutOnceForVerseIdRef.current = verse.id
      return
    }

    stashedInProgressRef.current = ip
    sessionSeedRef.current = ip.sessionSeed
    completedRef.current = false
    openedLayoutOnceForVerseIdRef.current = verse.id
  }, [verse.id, verse.inProgressPractice])

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
    if (phase !== 'practicing' || isVoiceMode) return
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
  }, [phase, isVoiceMode, keepPracticeInputOnPointerCapture])

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
      if (phase !== 'practicing' || isVoiceMode) return
      practiceInputRef.current?.focus({ preventScroll: true })
    })
  }, [phase, isVoiceMode])

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

  const startRoundForPracticeMode = useCallback(
    (r: number, mode: 'typing' | 'voice') => {
      if (mode === 'voice') {
        flushSync(() => {
          startRound(r)
        })
        if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
          practiceScrollRef.current.scrollTop = 0
        }
        return
      }
      startRoundAndFocusInput(r)
    },
    [startRound, startRoundAndFocusInput]
  )

  const savedKindForInProgress = useCallback(
    (ip: MemorizationInProgress): MemorizationPracticeKind =>
      ip.practiceKind === 'voice' ? 'voice' : 'typing',
    []
  )

  const beginOrResumePracticeFromIntro = useCallback(
    (chosen: 'typing' | 'voice') => {
      const ip = stashedInProgressRef.current
      if (!ip) {
        completedRef.current = false
        sessionSeedRef.current = generateMemorizationSessionSeed()
        setActivePracticeMode(chosen)
        startRoundForPracticeMode(1, chosen)
        onPersistInProgress?.({
          sessionSeed: sessionSeedRef.current,
          wrongAttempts: 0,
          correctKeystrokes: 0,
          practiceKind: chosen,
          ...(chosen === 'voice' ? { voiceTypableOffset: 0 } : {}),
          phase: { kind: 'inRound', roundIndex: 1 },
        })
        return
      }

      if (savedKindForInProgress(ip) !== chosen) {
        stashedInProgressRef.current = null
        skipIntroFullResetOnInProgressClearedRef.current = true
        onClearInProgress?.()
        completedRef.current = false
        sessionSeedRef.current = generateMemorizationSessionSeed()
        setActivePracticeMode(chosen)
        startRoundForPracticeMode(1, chosen)
        onPersistInProgress?.({
          sessionSeed: sessionSeedRef.current,
          wrongAttempts: 0,
          correctKeystrokes: 0,
          practiceKind: chosen,
          ...(chosen === 'voice' ? { voiceTypableOffset: 0 } : {}),
          phase: { kind: 'inRound', roundIndex: 1 },
        })
        return
      }

      stashedInProgressRef.current = null
      sessionSeedRef.current = ip.sessionSeed
      completedRef.current = false

      if (ip.phase.kind === 'betweenRounds') {
        const r = ip.phase.completedRoundIndex
        roundAdvanceHandledRef.current = r
        const seed = sessionSeedRef.current
        const localHidden = pickHiddenWordIndices(typableIndices.length, r, seed)
        const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
        const kind = savedKindForInProgress(ip)
        startTransition(() => {
          setActivePracticeMode(kind)
          setIntroView(kind === 'voice' ? 'voice' : 'typing')
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setRoundIndex(r)
          setHasTypedInRound(false)
          setHiddenIndices(hidden)
          setRevealed(new Set(hidden))
          setConsecutiveWrong(0)
          setVoiceTypableOffset(0)
          setVoiceConsecWrong(0)
          setDigitTypeCharIndex(0)
          setAwaitingRoundAdvance(true)
          setRoundAffirmation(pickRandomRoundAffirmation())
          setPhase('practicing')
        })
        requestAnimationFrame(() => {
          if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
            practiceScrollRef.current.scrollTop = 0
          }
          if (kind === 'typing') {
            practiceInputRef.current?.focus({ preventScroll: true })
          }
        })
        return
      }

      roundAdvanceHandledRef.current = null
      const r = ip.phase.roundIndex
      const localHidden = pickHiddenWordIndices(typableIndices.length, r, sessionSeedRef.current)
      const hidden = new Set([...localHidden].map((li) => typableIndices[li]!))
      const kind = savedKindForInProgress(ip)
      const vOff = kind === 'voice' ? (ip.voiceTypableOffset ?? 0) : 0
      if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
      startTransition(() => {
        setActivePracticeMode(kind)
        setIntroView(kind === 'voice' ? 'voice' : 'typing')
        setWrongAttemptsTotal(ip.wrongAttempts)
        setCorrectKeystrokesTotal(ip.correctKeystrokes)
        setRoundIndex(r)
        setHasTypedInRound(false)
        setHiddenIndices(hidden)
        setRevealed(new Set())
        setConsecutiveWrong(0)
        setVoiceTypableOffset(vOff)
        voiceOffsetRef.current = vOff
        setVoiceConsecWrong(0)
        setDigitTypeCharIndex(0)
        setAwaitingRoundAdvance(false)
        setRoundAffirmation('')
        setPhase('practicing')
      })
      requestAnimationFrame(() => {
        if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
          practiceScrollRef.current.scrollTop = 0
        }
        if (kind === 'typing') {
          practiceInputRef.current?.focus({ preventScroll: true })
        }
      })
    },
    [
      memorizeAndroidHost,
      onClearInProgress,
      onPersistInProgress,
      savedKindForInProgress,
      startRoundForPracticeMode,
      typableIndices,
    ]
  )

  const persistPracticeSnapshot = useCallback(
    (phasePayload: MemorizationInProgressSavePayload['phase']) => {
      if (!onPersistInProgress || !sessionSeedRef.current) return
      const kind: MemorizationPracticeKind = activePracticeMode === 'voice' ? 'voice' : 'typing'
      const voiceOff =
        kind === 'voice'
          ? phasePayload.kind === 'betweenRounds'
            ? 0
            : voiceOffsetRef.current
          : undefined
      onPersistInProgress({
        sessionSeed: sessionSeedRef.current,
        wrongAttempts: wrongAttemptsRef.current,
        correctKeystrokes: correctKeystrokesRef.current,
        phase: phasePayload,
        practiceKind: kind,
        ...(kind === 'voice' && typeof voiceOff === 'number' ? { voiceTypableOffset: voiceOff } : {}),
      })
    },
    [onPersistInProgress, activePracticeMode]
  )

  const handleClose = useCallback(() => {
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
  ])

  const handleStartOver = useCallback(() => {
    stopVoicePttSession({ skipDeferredFlush: true })
    stashedInProgressRef.current = null
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
      setIntroView('pick')
      setActivePracticeMode(null)
      setVoiceTypableOffset(0)
      setVoiceConsecWrong(0)
      setDigitTypeCharIndex(0)
    })
  }, [verse.id, onClearInProgress, stopVoicePttSession])

  useEffect(() => {
    if (phase !== 'practicing') return
    if (isVoiceMode) {
      if (typableIndices.length === 0) return
      if (voiceTypableOffset < typableIndices.length) return
    } else {
      if (hiddenIndices.size === 0) return
      const allBlanksDone = [...hiddenIndices].every((i) => revealed.has(i))
      if (!allBlanksDone) return
    }
    stopVoicePttSession()
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
  }, [
    phase,
    isVoiceMode,
    hiddenIndices,
    revealed,
    roundIndex,
    voiceTypableOffset,
    typableIndices,
    onComplete,
    onPersistInProgress,
    persistPracticeSnapshot,
    stopVoicePttSession,
  ])

  const processKeystroke = useCallback(
    (key: string) => {
      if (!isTypingPractice) return
      if (hintActive) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (key.length !== 1) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return

      setHasTypedInRound(true)

      if (token.kind === 'digit') {
        if (!/^[0-9]$/.test(key)) return
        const charPos = token.text.length > 1 ? digitTypeCharIndex : 0
        const expectedChar = token.text[charPos]
        if (key !== expectedChar) {
          if (token.text.length > 1) setDigitTypeCharIndex(0)
          setWrongAttemptsTotal((w) => w + 1)
          setConsecutiveWrong((c) => {
            const n = c + 1
            if (n >= MAX_WRONG_BEFORE_REVEAL) {
              const idx = currentTargetIndex
              const remainingDigits = token.text.length - charPos
              setRevealed((prev) => {
                const next = new Set(prev)
                next.add(idx)
                return next
              })
              setDigitTypeCharIndex(0)
              setCorrectKeystrokesTotal((ck) => ck + remainingDigits)
              return 0
            }
            return n
          })
          return
        }
        setConsecutiveWrong(0)
        setCorrectKeystrokesTotal((c) => c + 1)
        if (charPos + 1 < token.text.length) {
          setDigitTypeCharIndex(charPos + 1)
        } else {
          setDigitTypeCharIndex(0)
          const idx = currentTargetIndex
          setRevealed((prev) => {
            const next = new Set(prev)
            next.add(idx)
            return next
          })
        }
        return
      }

      if (token.kind !== 'word') return
      if (!/^[a-zA-Z]$/.test(key)) return
      const expected = expectedKeystrokeForToken(token, 0)
      if (!expected) return
      const correct = key.toLowerCase() === expected

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
        const isWrongKind = /^[a-zA-Z]$/.test(key)
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
      }
    },
    [phase, currentTargetIndex, tokens, hintActive, isTypingPractice, digitTypeCharIndex]
  )

  const handlePracticeInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!isTypingPractice) return
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
    [phase, currentTargetIndex, hintActive, processKeystroke, tokens, isTypingPractice]
  )

  /** Mobile keyboards often omit keydown letters; input events still receive the character. */
  const handlePracticeInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      if (!isTypingPractice) return
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
    [phase, currentTargetIndex, hintActive, processKeystroke, tokens, isTypingPractice]
  )

  /** Keep the latest; native speech callbacks are not re-bound when this changes (stable handleVoiceTranscript). */
  voicePttStateRef.current = { tokens, typableIndices, hiddenIndices, isVoiceMode, phase }

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      if (hintHeldRef.current) return
      const { isVoiceMode: voice, phase: ph } = voicePttStateRef.current
      if (!voice || ph !== 'practicing' || awaitingRoundAdvanceRef.current) return
      const t = (transcript == null ? '' : typeof transcript === 'string' ? transcript : String(transcript)).trim()
      const prevLong = pttTranscriptLongestRef.current
      const { tokens: tks, typableIndices: ti, hiddenIndices: hi } = voicePttStateRef.current
      // Always reconcile: a *shorter* new partial is often a segment reset or a fresh take after a
      // wrong word — the old `if (t.length < prevLong) keep prevLong` stuck users until they
      // stopped and restarted PTT. See selectBestTranscriptForVoiceMatch.
      const chosen = selectBestTranscriptForVoiceMatch(prevLong, t, {
        tokens: tks,
        typableIndices: ti,
        pttStartStep: pttAtDownRef.current,
        hiddenIndices: hi,
        consecutiveWrong: voiceConsecWrongRef.current,
      })
      pttTranscriptLongestRef.current = chosen
      const effectiveT = chosen
      pendingVoiceApplyEffectiveTRef.current = effectiveT
      applyMemorizeVoiceTranscript(effectiveT)
    },
    [applyMemorizeVoiceTranscript]
  )

  const handleVoicePttButtonClick = useCallback(async () => {
    if (!isVoiceMode || phase !== 'practicing' || awaitingRoundAdvanceRef.current) return
    if (hintHeldRef.current) return
    if (pttControllerRef.current) {
      stopVoicePttSession()
      return
    }
    if (pttStartInFlightRef.current) return
    pttStartInFlightRef.current = true
    pttAtDownRef.current = voiceOffsetRef.current
    lastVoiceTranscriptRef.current = ''
    pttTranscriptLongestRef.current = ''
    lastVoiceTranscriptProcessedRef.current = ''
    lastVoicePartialTokensRef.current = null
    pendingVoiceApplyEffectiveTRef.current = ''
    try {
      const ok = await requestMemorizeSpeechPermissions()
      if (!ok) {
        logger.warn('Memorize voice: speech permission denied')
        return
      }
      const ctrl = await startVoicePtt(
        handleVoiceTranscript,
        (msg) => logger.warn('Memorize voice recognition:', msg)
      )
      pttControllerRef.current = ctrl
      setPttListening(true)
    } catch (e) {
      logger.warn('Memorize voice PTT start failed', e)
    } finally {
      pttStartInFlightRef.current = false
    }
  }, [isVoiceMode, phase, handleVoiceTranscript, stopVoicePttSession])

  useEffect(() => {
    return () => {
      stopVoicePttSession({ skipDeferredFlush: true })
    }
  }, [stopVoicePttSession])

  useEffect(() => {
    if (!isTypingPractice) return
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
  }, [
    isTypingPractice,
    phase,
    awaitingRoundAdvance,
    roundIndex,
    currentTargetIndex,
    hintActive,
    hasTypedInRound,
    scrollCurrentBlankIntoView,
  ])

  /** Keep the active blank centered as you advance (and after round changes). */
  useEffect(() => {
    if (!isTypingPractice) return
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    if (!hasTypedInRound) return
    scrollCurrentBlankIntoView()
  }, [isTypingPractice, phase, awaitingRoundAdvance, currentTargetIndex, roundIndex, hasTypedInRound, scrollCurrentBlankIntoView])

  /** Keep the next spoken word in view for voice practice. */
  useEffect(() => {
    if (!isVoiceMode) return
    if (phase !== 'practicing' || awaitingRoundAdvance) return
    if (voiceHighlightIndex === null) return
    const id = window.setTimeout(() => scrollCurrentBlankIntoView(), 0)
    return () => window.clearTimeout(id)
  }, [isVoiceMode, phase, awaitingRoundAdvance, voiceHighlightIndex, voiceTypableOffset, scrollCurrentBlankIntoView])

  /** When the keyboard resizes the visual viewport, re-nudge so the current blank stays above it. */
  useEffect(() => {
    if (!isTypingPractice) return
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    if (!hasTypedInRound) return
    const delayMs = isMemorizeAndroidWebHost() ? 120 : 80
    const id = window.setTimeout(() => scrollCurrentBlankIntoView(), delayMs)
    return () => window.clearTimeout(id)
  }, [
    isTypingPractice,
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
                  hintHeldRef.current = true
                  if (isVoiceMode) {
                    stopVoicePttSession({ skipDeferredFlush: true })
                  }
                  setHintPeekCount(1)
                  setHintHeld(true)
                }}
                onPointerUp={() => {
                  hintHeldRef.current = false
                  setHintPeekCount(1)
                  setHintHeld(false)
                  restorePracticeInputFocusAfterHint()
                }}
                onPointerLeave={() => {
                  hintHeldRef.current = false
                  setHintPeekCount(1)
                  setHintHeld(false)
                  restorePracticeInputFocusAfterHint()
                }}
                onPointerCancel={() => {
                  hintHeldRef.current = false
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
          {showMemorizeTypingInputs && memorizeAndroidHost && (
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
              aria-label="Type the first letter of each blank word, or type reference numbers one digit at a time"
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
              isTypingPractice && keyboardInsetPx > 0
                ? { paddingBottom: `calc(${keyboardInsetPx}px + 0.5rem)` }
                : undefined
            }
          >
          {showMemorizeTypingInputs && !memorizeAndroidHost && (
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
              aria-label="Type the first letter of each blank word, or type reference numbers one digit at a time"
              data-testid="memorize-practice-input"
              tabIndex={phase === 'intro' || awaitingRoundAdvance ? -1 : 0}
              className="absolute left-0 top-0 z-0 h-px w-full max-w-full border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
              onKeyDown={handlePracticeInputKeyDown}
              onInput={handlePracticeInput}
            />
          )}
          {phase === 'intro' && introView === 'pick' && (
            <div>
              <p
                className="text-base leading-relaxed text-slate-900 dark:text-slate-100 font-serif mb-4"
                data-testid="memorize-intro-text"
              >
                {formatMemorizationTokensPlain(tokens)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Choose how you would like to practice.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  data-tour="memorize-choose-typing"
                  onClick={() => {
                    setIntroView('typing')
                  }}
                  className="w-full sm:flex-1 px-4 py-3 rounded-lg font-medium transition-colors border-2 border-blue-300 dark:border-blue-600 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  Type (first letter)
                </button>
                <button
                  type="button"
                  data-testid="memorize-choose-voice"
                  disabled={!speechPluginInBuild || voiceGateBusy}
                  onClick={async () => {
                    if (!speechPluginInBuild) return
                    setVoiceGateBusy(true)
                    try {
                      const ok = await ensureMemorizeVoiceReady()
                      if (ok) setIntroView('voice')
                    } finally {
                      setVoiceGateBusy(false)
                    }
                  }}
                  className="w-full sm:flex-1 px-4 py-3 rounded-lg font-medium transition-colors border-2 border-blue-300 dark:border-blue-600 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voiceGateBusy ? 'Requesting access…' : 'Use voice'}
                </button>
              </div>
              {!isNative && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Voice uses the device microphone in the <strong className="font-medium">iOS or Android</strong> app. In
                  the browser, use <strong className="font-medium">Type (first letter)</strong>.
                </p>
              )}
              {isNative && !nativeSpeechAvailable && (
                <p className="text-xs text-amber-700 dark:text-amber-200 mt-2">
                  {!speechPluginInBuild ? (
                    <>
                      This app install does not include the speech add-on. From the <code className="text-[0.8rem]">gospel-admin</code>{' '}
                      folder run <code className="text-[0.8rem]">npx cap sync</code>, then in Xcode (or Android Studio) clean
                      build and reinstall. You can still use typing.
                    </>
                  ) : capPlatform === 'ios' ? (
                    <>
                      Tap <strong className="font-medium">Use voice</strong> to trigger the <strong>microphone</strong> and{' '}
                      <strong>Speech Recognition</strong> permission prompts. If you have denied them before, use{' '}
                      <strong>Settings</strong> → <strong>Privacy &amp; Security</strong> (or your app in the main list) to
                      turn them on. The <strong className="font-medium">iOS Simulator</strong> often cannot do voice; use a real
                      iPhone. You can still use typing.
                    </>
                  ) : (
                    <>
                      Tap <strong className="font-medium">Use voice</strong> to allow the microphone; Android may also ask
                      for speech. You can still use typing.
                    </>
                  )}
                </p>
              )}
            </div>
          )}
          {phase === 'intro' && introView === 'typing' && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Read the verse and reference, then practice: first letter of each word, reference numbers one
                digit at a time; colons and dashes in the reference are shown and are not typed.
              </p>
              <button
                type="button"
                onClick={() => setIntroView('pick')}
                className="text-xs text-slate-500 dark:text-slate-400 mb-2 underline hover:text-slate-700 dark:hover:text-slate-200"
              >
                Back to mode options
              </button>
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
                  beginOrResumePracticeFromIntro('typing')
                }}
                className="mt-6 w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                Start practice
              </button>
            </div>
          )}
          {phase === 'intro' && introView === 'voice' && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Speak the verse and reference in order, word for word, including words that are not blanked. Hold the
                button at the bottom to talk; release to stop. The same five rounds add more hidden words as you go.
              </p>
              <button
                type="button"
                onClick={() => setIntroView('pick')}
                className="text-xs text-slate-500 dark:text-slate-400 mb-2 underline hover:text-slate-700 dark:hover:text-slate-200"
              >
                Back to mode options
              </button>
              <p
                className="text-base leading-relaxed text-slate-900 dark:text-slate-100 font-serif"
                data-testid="memorize-intro-voice-verse"
              >
                {formatMemorizationTokensPlain(tokens)}
              </p>
              <button
                type="button"
                data-tour="memorize-start-voice-practice"
                disabled={!speechPluginInBuild || voiceGateBusy}
                onClick={async () => {
                  if (!speechPluginInBuild) return
                  setVoiceGateBusy(true)
                  try {
                    const ok = await ensureMemorizeVoiceReady()
                    if (!ok) return
                    beginOrResumePracticeFromIntro('voice')
                  } finally {
                    setVoiceGateBusy(false)
                  }
                }}
                className="mt-6 w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50"
              >
                {voiceGateBusy ? 'Requesting access…' : 'Start voice practice'}
              </button>
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
                  {isVoiceMode ? (
                    <>
                      Say each word or whole reference number in order through the verse and the citation. For
                      numbers like 23 or 103, use one phrase
                      (e.g. &quot;twenty three&quot;, &quot;one hundred three&quot;), not separate digits. Do
                      not say colons in references. Hold <strong className="font-medium">Hint</strong> in the
                      header to peek at still-hidden words; the next one appears about every second while you
                      keep holding. Listening is paused while Hint is held.
                    </>
                  ) : (
                    <>
                      {currentTargetIndex !== null &&
                        (currentTargetToken?.kind === 'digit'
                          ? 'Type the next digit (left to right). Colons and dashes in the reference are not typed.'
                          : 'Type the first letter of the next blank (left to right). Hold Hint to peek; another blank appears every second while you hold.')}
                      {currentTargetIndex !== null && ' '}
                      Tap the verse or blanks if the keyboard closed.
                    </>
                  )}
                </p>
              )}
              <div
                ref={practiceWordsRef}
                role="group"
                aria-label={
                  isVoiceMode
                    ? 'Verse practice area; speak the next word in order'
                    : 'Verse practice area; tap to show the keyboard again'
                }
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
                  if (awaitingRoundAdvance || isVoiceMode) return
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
                className={`touch-manipulation text-base leading-relaxed font-serif font-normal antialiased flex flex-wrap gap-x-1 gap-y-2 items-baseline [font-synthesis-weight:none] [font-synthesis-style:none] rounded-md p-1 ring-2 ring-inset ring-transparent transition-shadow ${
                  isVoiceMode ? 'cursor-default' : 'cursor-text'
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
                  const isTypingCurrent = showBlankUnderline && i === currentTargetIndex
                  const isVoiceCurrent =
                    isVoiceMode && voiceHighlightIndex === i
                  const isVoiceSpoken = isVoiceMode && voiceSpokenTokenIndices.has(i) && !isVoiceCurrent
                  const isCurrent = isTypingCurrent || isVoiceCurrent

                  let innerClass = 'text-slate-900 dark:text-slate-100'
                  if (showBlankUnderline) {
                    innerClass = showViaHint
                      ? 'text-blue-800 dark:text-blue-200 not-italic'
                      : 'text-transparent select-none pointer-events-none'
                  }
                  const showVoiceWord = !showBlankUnderline || isRevealed || showViaHint
                  if (isVoiceSpoken && showVoiceWord) {
                    innerClass = `${innerClass} text-slate-500/95 dark:text-slate-400/95`
                  }
                  if (isVoiceCurrent && isVoiceMode && showVoiceWord) {
                    innerClass = `${innerClass} underline decoration-2 underline-offset-[0.2em] decoration-blue-600 dark:decoration-blue-300 not-italic text-slate-900 dark:text-slate-100`
                  }
                  if (isVoiceCurrent && isVoiceMode && showBlankUnderline && !showVoiceWord) {
                    // Next word is a hidden blank: keep letters invisible; the span border shows the “underline”.
                    innerClass = 'text-transparent select-none pointer-events-none'
                  }

                  const blankBorderForVoice = isVoiceMode && isVoiceCurrent && showBlankUnderline
                  return (
                    <span
                      key={`tok-${i}`}
                      data-memorize-current-blank={isCurrent ? 'true' : undefined}
                      className={`inline-flex items-baseline justify-center border-b-2 border-solid box-border px-0.5 min-h-[1.5em] min-w-[0.6em] ${
                        token.kind === 'digit' ? 'tabular-nums' : ''
                      } ${
                        showBlankUnderline
                          ? blankBorderForVoice
                            ? 'border-blue-500 dark:border-blue-400'
                            : 'border-slate-400 dark:border-slate-500'
                          : 'border-transparent'
                      } ${
                        isVoiceCurrent && isVoiceMode
                          ? showBlankUnderline
                            ? 'bg-blue-100/80 dark:bg-blue-900/40'
                            : ''
                          : isCurrent
                            ? 'bg-blue-100/80 dark:bg-blue-900/40'
                            : ''
                      }`}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      <span
                        className={`leading-relaxed ${innerClass}`}
                        aria-hidden={showBlankUnderline && !showViaHint}
                        data-memorize-hint-peek={showViaHint ? 'true' : undefined}
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

          {phase === 'practicing' && isVoiceMode && !awaitingRoundAdvance && (
            <div
              className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-50/90 dark:bg-slate-900/80"
              data-testid="memorize-voice-ptt-bar"
            >
              <button
                type="button"
                data-testid="memorize-voice-ptt"
                className={`w-full min-h-14 rounded-xl font-medium text-base select-none touch-manipulation transition-colors cursor-pointer border text-blue-800 dark:text-blue-200 active:scale-[0.99] disabled:opacity-50 ${
                  pttListening
                    ? 'bg-blue-200 dark:bg-blue-900/60 border-blue-300 dark:border-blue-600'
                    : 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
                aria-pressed={pttListening}
                aria-label={pttListening ? 'Listening; tap to stop' : 'Tap to speak; tap again to stop'}
                onClick={() => void handleVoicePttButtonClick()}
              >
                {pttListening ? 'Tap to stop' : 'Tap to speak'}
              </button>
            </div>
          )}

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
                    if (isVoiceMode) voiceOffsetRef.current = 0
                    persistPracticeSnapshot({ kind: 'inRound', roundIndex })
                    startRoundForPracticeMode(roundIndex, isVoiceMode ? 'voice' : 'typing')
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Repeat this round
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isVoiceMode) voiceOffsetRef.current = 0
                    persistPracticeSnapshot({ kind: 'inRound', roundIndex: roundIndex + 1 })
                    startRoundForPracticeMode(
                      roundIndex + 1,
                      isVoiceMode ? 'voice' : 'typing'
                    )
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
