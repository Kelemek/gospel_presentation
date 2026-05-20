'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useId,
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
  MemorizationPracticeMode,
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
import { MemorizationReorderPanel } from '@/components/MemorizationReorderPanel'
import { MemorizeListenControlsDialog } from '@/components/MemorizeListenControlsDialog'
import ScriptureModalToolbarMenu from '@/components/ScriptureModalToolbarMenu'
import {
  applyMemorizeListenPlaybackRateToMediaElement,
  MEMORIZE_LISTEN_REPEAT_GAP_MS,
  readMemorizeListenSpeedFromStorage,
  toMemorizeWebSpeechUtteranceRate,
  writeMemorizeListenSpeedToStorage,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import { dispatchWebSpeechExclusiveOwner } from '@/lib/exclusiveWebSpeechListen'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  buildInitialReorderSlotAssignment,
  buildMemorizationChoiceLabels,
  buildMemorizationReorderChunks,
  buildMemorizationTokens,
  cueGlyphForTypableToken,
  firstLetterOfWord,
  formatMemorizationTokensPlain,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  hiddenFractionForRound,
  pickHiddenCueTypableSlotIndices,
  pickHiddenWordIndices,
  pickReorderMovableIndices,
  reorderReferenceColonAfterSlotIndex,
  reorderMovableCountForRound,
  seedRandom,
  stringToSeed,
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
  /**
   * When set, shows a **Study** control (enabled when indexed public Spurgeon sermons cite this passage
   * per `GET /api/scripture/spurgeon-links`; otherwise greyed out), same pattern as `ScriptureModal` Study.
   */
  onOpenSpurgeonStudy?: (reference: string) => void
}

type Phase = 'intro' | 'practicing' | 'done'

const MAX_WRONG_BEFORE_REVEAL = 3

const MEMORIZATION_WORD_CHOICE_COUNT_WORD = 8
const MEMORIZATION_WORD_CHOICE_COUNT_DIGIT = 4

/** Extra inset beyond the viewport edge so the current blank sits higher above the soft keyboard. */
const MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX = 48

/** While Hint is held, each tick reveals one more unrevealed blank (left to right). */
const MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS = 1000

/** On Android, clamp the practice column scrollTop to 0 for this many ms after a round starts. */
const ANDROID_SCROLL_CLAMP_MS = 600

const MEMORIZE_LISTEN_CONTROLS_DIALOG_ID = 'memorize-listen-controls-dialog'
const MEMORIZE_LISTEN_CONTROLS_TITLE_ID = 'memorize-listen-controls-title'

const MEMORIZE_INTRO_START_ROUND_OPTIONS = Array.from({ length: MEMORIZATION_FULL_HIDE_ROUND }, (_, i) => ({
  value: String(i + 1),
  label: `Round ${i + 1}`,
}))

function isKeyboardPracticeMode(mode: MemorizationPracticeMode | null): boolean {
  return mode === 'type' || mode === 'firstLetters'
}

/** Hidden token indices for type / word / firstLetters (firstLetters = all typable hidden every round). */
function hiddenTypingTokenIndices(
  mode: MemorizationPracticeMode | null | undefined,
  roundIndex: number,
  seed: string,
  typableIndices: number[]
): Set<number> {
  if (mode === 'firstLetters') return new Set(typableIndices)
  const localHidden = pickHiddenWordIndices(typableIndices.length, roundIndex, seed)
  return new Set([...localHidden].map((li) => typableIndices[li]!))
}

function scrollActiveFirstLetterCueIntoView(
  root: HTMLDivElement | null,
  currentTargetIndex: number | null,
  typableIndices: number[]
) {
  if (!root) return
  const slot = currentTargetIndex !== null ? typableIndices.indexOf(currentTargetIndex) : -1
  const target =
    slot >= 0 ? root.querySelector<HTMLElement>(`[data-memorize-cue-slot="${slot}"]`) : null
  if (target) {
    try {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
    } catch {
      /* jsdom / test env may not fully implement scrollIntoView */
    }
  } else {
    root.scrollTop = 0
  }
}

export default function MemorizationPracticeSession({
  verse,
  onClose,
  onComplete,
  onPersistInProgress,
  onClearInProgress,
  onOpenSpurgeonStudy,
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
  const reorderChunks = useMemo(
    () => buildMemorizationReorderChunks(verse.text, verse.reference),
    [verse.text, verse.reference]
  )
  const reorderColonAfterSlotIndex = useMemo(
    () => reorderReferenceColonAfterSlotIndex(reorderChunks.length, verse.reference),
    [reorderChunks.length, verse.reference]
  )
  const typableIndices = useMemo(() => getTypableTokenIndices(tokens), [tokens])
  /** Hide IME field outside the verse scroller so Android does not scrollTo focused input (top of column). */
  const memorizeAndroidHost = useMemo(() => isMemorizeAndroidWebHost(), [])

  const [phase, setPhase] = useState<Phase>('intro')
  /** Set when user picks from the start modal; restored from saved in-progress. Null on intro before starting. */
  const [practiceMode, setPracticeMode] = useState<MemorizationPracticeMode | null>(null)
  const [modePickerOpen, setModePickerOpen] = useState(false)
  /** Intro-only: which round to begin at (1…MEMORIZATION_FULL_HIDE_ROUND); chains forward to round 5. */
  const [startRoundChoice, setStartRoundChoice] = useState(1)
  const [roundIndex, setRoundIndex] = useState(0)
  const [hasTypedInRound, setHasTypedInRound] = useState(false)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  /** firstLetters: typable-slot indices whose cue glyph was hidden but revealed by typing the correct first letter/digit. */
  const [firstLetterCueRevealedSlots, setFirstLetterCueRevealedSlots] = useState(() => new Set<number>())
  /** Reorder mode: `slotChunkIds[slot]` = chunk id shown at that slot (parallel to `reorderChunks`). */
  const [reorderSlotChunkIds, setReorderSlotChunkIds] = useState<number[]>([])
  const [reorderRoundMovableIndices, setReorderRoundMovableIndices] = useState<Set<number>>(
    () => new Set()
  )
  const [, setConsecutiveWrong] = useState(0)
  const [wrongAttemptsTotal, setWrongAttemptsTotal] = useState(0)
  const [correctKeystrokesTotal, setCorrectKeystrokesTotal] = useState(0)
  /** Latest totals for persist / onComplete without churning callbacks on every wrong key. */
  const wrongAttemptsRef = useRef(0)
  const correctKeystrokesRef = useRef(0)
  const practiceModeRef = useRef<MemorizationPracticeMode | null>(null)
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
  /** ESV: passage stream. Non-ESV: Web TTS — hidden on Android until native TTS is reliable. */
  const translationListenEnabled = useMemo(
    () => listenViaEsvPassageUrl || !memorizeAndroidHost,
    [listenViaEsvPassageUrl, memorizeAndroidHost]
  )
  /** Intro or an active (typing) round — not the between-rounds affirmation / footer step. */
  const listenInteractionAllowed = useMemo(
    () =>
      translationListenEnabled &&
      (phase === 'intro' || (phase === 'practicing' && !awaitingRoundAdvance)),
    [translationListenEnabled, phase, awaitingRoundAdvance]
  )
  const passageAudioRef = useRef<HTMLAudioElement | null>(null)
  /** Rate the current Web Speech utterance was started with (resume cannot change rate; restart if it differs). */
  const memorizeListenTtsRateAtStartRef = useRef<MemorizeListenSpeed | null>(null)
  /** Set when the user pauses TTS; some WebKit versions keep `!speechSynthesis.paused` briefly after `pause()`. */
  const memorizeListenTtsUserPausedRef = useRef(false)
  /** Set after `speechSynthesis.resume()` until `!paused` is observed (pause flag can lag; `onstart` may not re-fire on resume). */
  const memorizeListenTtsPostResumeRef = useRef(false)
  /** True while the active `speechSynthesis` utterance was started by this memorize session (not profile Listen). */
  const memorizeWebSpeechUtteranceIsOursRef = useRef(false)
  const [passageAudioPlaying, setPassageAudioPlaying] = useState(false)
  /** Bumps on speechSynthesis start/end/pause so Play / Pause labels re-render. */
  const [listenUiTick, setListenUiTick] = useState(0)
  const bumpListen = useCallback(() => setListenUiTick((n) => n + 1), [])

  /** Indexed study resources for this verse (`/api/scripture/spurgeon-links`); mirrors ScriptureModal. */
  const [spurgeonStudyMatch, setSpurgeonStudyMatch] = useState<'unset' | 'loading' | 'yes' | 'no'>('unset')
  const [listenPanelOpen, setListenPanelOpen] = useState(false)
  const [listenPlaybackRate, setListenPlaybackRate] = useState<MemorizeListenSpeed>(1)
  /** Latest rate for timeouts / stale `beginTtsUtterance` closures (e.g. repeat gap after speed change in-dialog). */
  const listenPlaybackRateRef = useRef<MemorizeListenSpeed>(listenPlaybackRate)
  listenPlaybackRateRef.current = listenPlaybackRate
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

  useEffect(() => {
    setListenPlaybackRate(readMemorizeListenSpeedFromStorage())
  }, [])

  useEffect(() => {
    if (!onOpenSpurgeonStudy || !verse.reference.trim()) {
      setSpurgeonStudyMatch('unset')
      return
    }
    let cancelled = false
    setSpurgeonStudyMatch('loading')
    void fetch(
      `/api/scripture/spurgeon-links?reference=${encodeURIComponent(verse.reference.trim())}`,
      { cache: 'no-store' }
    )
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => ({}))
        if (cancelled) return
        const payload = data as {
          items?: unknown
          sermonCount?: number
          morneveCount?: number
          calvinCount?: number
        }
        const sermonCount =
          typeof payload.sermonCount === 'number'
            ? payload.sermonCount
            : Array.isArray(payload.items)
              ? payload.items.length
              : 0
        const morneveCount = typeof payload.morneveCount === 'number' ? payload.morneveCount : 0
        const calvinCount = typeof payload.calvinCount === 'number' ? payload.calvinCount : 0
        setSpurgeonStudyMatch(sermonCount + morneveCount + calvinCount > 0 ? 'yes' : 'no')
      })
      .catch(() => {
        if (!cancelled) setSpurgeonStudyMatch('no')
      })
    return () => {
      cancelled = true
    }
  }, [verse.reference, onOpenSpurgeonStudy])

  useEffect(() => {
    const el = passageAudioRef.current
    if (!el) return
    applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRate)
    // Rate changes and apply() can get React play state and the <audio> element out of sync; resync the Listen label.
    bumpListen()
  }, [bumpListen, listenPlaybackRate])

  const stopPassageAudio = useCallback(() => {
    clearListenRepeatGapTimer()
    repeatListenOnRef.current = false
    setRepeatListenOn(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    memorizeListenTtsRateAtStartRef.current = null
    memorizeListenTtsUserPausedRef.current = false
    memorizeListenTtsPostResumeRef.current = false
    const el = passageAudioRef.current
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    setPassageAudioPlaying(false)
    bumpListen()
  }, [bumpListen, clearListenRepeatGapTimer])

  useEffect(() => {
    if (typeof window === 'undefined') return
    dispatchWebSpeechExclusiveOwner({ owner: 'memorize-practice' })
    stopPassageAudio()
    memorizeWebSpeechUtteranceIsOursRef.current = false
    bumpListen()
  }, [bumpListen, stopPassageAudio])

  const listenButtonLabel = useMemo(() => {
    // `listenUiTick` bumps on speech / audio, panel open, and rate changes (see effects that call `bumpListen`).
    void listenUiTick
    if (listenViaEsvPassageUrl) {
      const el = passageAudioRef.current
      if (el?.getAttribute('src')) {
        return !el.paused && !el.ended ? 'Pause' : 'Listen'
      }
      return passageAudioPlaying ? 'Pause' : 'Listen'
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return 'Listen'
    }
    const syn = window.speechSynthesis
    if (memorizeListenTtsUserPausedRef.current) {
      return 'Listen'
    }
    if (memorizeListenTtsPostResumeRef.current && syn.speaking) {
      return 'Pause'
    }
    // Paused mid-utterance uses the same "Play" label as idle; click still resumes via `handleListenPassageClick`.
    if (syn.speaking && !syn.paused) return 'Pause'
    return 'Listen'
  }, [listenUiTick, listenViaEsvPassageUrl, passageAudioPlaying])

  const listenAriaPressed = useMemo(() => {
    void listenUiTick
    if (listenViaEsvPassageUrl) {
      const el = passageAudioRef.current
      if (el?.getAttribute('src')) {
        return !el.paused && !el.ended
      }
      return passageAudioPlaying
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false
    }
    const syn = window.speechSynthesis
    if (memorizeListenTtsUserPausedRef.current) {
      return false
    }
    if (memorizeListenTtsPostResumeRef.current && syn.speaking) {
      return true
    }
    return syn.speaking && !syn.paused
  }, [listenUiTick, listenViaEsvPassageUrl, passageAudioPlaying])

  /** Sub-dialog uses "Play" instead of "Listen"; only "Pause" is distinct (no separate Resume label for TTS). */
  const readAloudDialogPrimaryLabel = useMemo(
    () => (listenButtonLabel === 'Listen' ? 'Play' : listenButtonLabel),
    [listenButtonLabel]
  )
  const readAloudDialogPrimaryAriaLabel = useMemo(() => {
    if (listenButtonLabel === 'Pause') {
      return 'Pause read-aloud of the passage'
    }
    if (listenViaEsvPassageUrl) {
      return 'Play the passage read aloud (ESV audio)'
    }
    return 'Play: read the memorized text aloud using the device (same translation is not available as streaming audio)'
  }, [listenButtonLabel, listenViaEsvPassageUrl])

  useLayoutEffect(() => {
    wrongAttemptsRef.current = wrongAttemptsTotal
    correctKeystrokesRef.current = correctKeystrokesTotal
    awaitingRoundAdvanceRef.current = awaitingRoundAdvance
    practiceModeRef.current = practiceMode
  }, [wrongAttemptsTotal, correctKeystrokesTotal, awaitingRoundAdvance, practiceMode])
  /**
   * On Android, Chrome scrolls the overflow column during the keyboard-open animation,
   * overriding our scrollTop=0. This timestamp lets a scroll-event listener clamp the
   * column to 0 for ANDROID_SCROLL_CLAMP_MS after a round starts or resumes.
   */
  const androidScrollClampUntilRef = useRef(0)
  /** If keydown already handled a letter, skip the matching input event (avoids double counts). */
  const suppressInputFromKeydownRef = useRef(false)
  const practiceScrollRef = useRef<HTMLDivElement>(null)
  /** Initials mode: scrollport for cue row (shows ~3 lines; active blank centered vertically). */
  const firstLetterCuesViewportRef = useRef<HTMLDivElement>(null)
  const practiceInputDomId = useId()
  const modePickerTitleId = useId()
  /** Word mode: verse wrapper `div`. Type mode: focus target `label`. Only one mounts per mode. */
  const practiceWordsWordRef = useRef<HTMLDivElement | null>(null)
  const practiceWordsTypeRef = useRef<HTMLLabelElement | null>(null)
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
      setStartRoundChoice(1)
      setRoundIndex(0)
      setHasTypedInRound(false)
      setHiddenIndices(new Set())
      setRevealed(new Set())
      setFirstLetterCueRevealedSlots(new Set())
      setWrongAttemptsTotal(0)
      setCorrectKeystrokesTotal(0)
      setPracticeMode(null)
      setModePickerOpen(false)
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

  /**
   * Round-5 completion mounts inside the same `overflow-y-auto` column used for the verse. If the reader had
   * scrolled down (or iOS nudged scroll for the keyboard), `scrollTop` can stay large while `scrollHeight`
   * shrinks to the short “done” block — WebKit/Capacitor then shows a blank viewport until something relayouts
   * (e.g. app resume). Reset scroll synchronously before paint; `overflow-y-hidden` on the done phase avoids
   * a stray scroll position sticking around.
   */
  useLayoutEffect(() => {
    if (phase !== 'done') return
    const el = practiceScrollRef.current
    if (!el) return
    el.scrollTop = 0
    window.requestAnimationFrame(() => {
      el.scrollTop = 0
    })
  }, [phase])

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
    if (practiceMode === 'reorder') return
    const id = window.setInterval(() => {
      setHintPeekCount((c) => Math.min(c + 1, unrevealedLenRef.current))
    }, MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS)
    return () => {
      window.clearInterval(id)
    }
  }, [hintActive, practiceMode])

  const currentTargetIndex = useMemo(() => {
    for (const idx of hiddenSorted) {
      if (!revealed.has(idx)) return idx
    }
    return null
  }, [hiddenSorted, revealed])

  const currentTargetToken =
    currentTargetIndex !== null ? (tokens[currentTargetIndex] ?? null) : null

  const firstLetterCueHiddenSlots = useMemo(() => {
    if (practiceMode !== 'firstLetters' || phase !== 'practicing') return new Set<number>()
    const seed = sessionSeedRef.current || verse.id
    return pickHiddenCueTypableSlotIndices(typableIndices.length, roundIndex, seed)
  }, [practiceMode, phase, typableIndices.length, roundIndex, verse.id])

  const firstLetterCueHiddenSlotsRef = useRef(firstLetterCueHiddenSlots)
  firstLetterCueHiddenSlotsRef.current = firstLetterCueHiddenSlots

  useLayoutEffect(() => {
    if (practiceMode !== 'firstLetters' || phase !== 'practicing' || awaitingRoundAdvance) return
    scrollActiveFirstLetterCueIntoView(
      firstLetterCuesViewportRef.current,
      currentTargetIndex,
      typableIndices
    )
  }, [
    practiceMode,
    phase,
    awaitingRoundAdvance,
    currentTargetIndex,
    typableIndices,
    roundIndex,
    firstLetterCueHiddenSlots,
    firstLetterCueRevealedSlots,
    tokens,
  ])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    if (practiceMode !== 'firstLetters' || phase !== 'practicing' || awaitingRoundAdvance) return
    const root = firstLetterCuesViewportRef.current
    if (!root) return
    let raf = 0
    const schedule = () => {
      if (raf) window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        raf = 0
        if (!root.isConnected) return
        scrollActiveFirstLetterCueIntoView(root, currentTargetIndex, typableIndices)
      })
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    return () => {
      ro.disconnect()
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [
    practiceMode,
    phase,
    awaitingRoundAdvance,
    currentTargetIndex,
    typableIndices,
  ])

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
      if (practiceModeRef.current === 'reorder') {
        const chunkList = buildMemorizationReorderChunks(verse.text, verse.reference)
        const n = chunkList.length
        const movableArr = pickReorderMovableIndices(n, r, seed)
        const rng = seedRandom(stringToSeed(`${seed}-mem-reorder-assign-r${r}`))
        const assignment = buildInitialReorderSlotAssignment(n, movableArr, rng)
        if (memorizeAndroidHost) {
          androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
        }
        setRoundIndex(r)
        setHasTypedInRound(false)
        setReorderSlotChunkIds(assignment)
        setReorderRoundMovableIndices(new Set(movableArr))
        setHiddenIndices(new Set())
        setRevealed(new Set())
        setFirstLetterCueRevealedSlots(new Set())
        setConsecutiveWrong(0)
        setAwaitingRoundAdvance(false)
        setRoundAffirmation('')
        setPhase('practicing')
        return
      }
      const hidden = hiddenTypingTokenIndices(practiceModeRef.current, r, seed, typableIndices)
      if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
      setRoundIndex(r)
      setHasTypedInRound(false)
      setHiddenIndices(hidden)
      setRevealed(new Set())
      setFirstLetterCueRevealedSlots(new Set())
      setConsecutiveWrong(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setPhase('practicing')
    },
    [memorizeAndroidHost, typableIndices, verse.id, verse.text, verse.reference]
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
      const seed = sessionSeedRef.current || verse.id
      const modeRaw = ip.practiceMode ?? 'type'
      if (modeRaw === 'reorder') {
        const chunkList = buildMemorizationReorderChunks(verse.text, verse.reference)
        const n = chunkList.length
        const identitySlots = n === 0 ? [] : Array.from({ length: n }, (_, i) => i)
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setRoundIndex(r)
          setHasTypedInRound(false)
          setHiddenIndices(new Set())
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setReorderSlotChunkIds(identitySlots)
          setReorderRoundMovableIndices(new Set())
          setConsecutiveWrong(0)
          setAwaitingRoundAdvance(true)
          setRoundAffirmation(pickRandomRoundAffirmation())
          setPhase('practicing')
          setPracticeMode('reorder')
        })
      } else {
        const hidden = hiddenTypingTokenIndices(modeRaw, r, seed, typableIndices)
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setRoundIndex(r)
          setHasTypedInRound(false)
          setHiddenIndices(hidden)
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setConsecutiveWrong(0)
          setAwaitingRoundAdvance(true)
          setRoundAffirmation(pickRandomRoundAffirmation())
          setPhase('practicing')
          setPracticeMode(modeRaw)
        })
      }
    } else {
      roundAdvanceHandledRef.current = null
      const r = ip.phase.roundIndex
      const modeRaw = ip.practiceMode ?? 'type'
      if (modeRaw === 'reorder') {
        const seed = sessionSeedRef.current
        const chunkList = buildMemorizationReorderChunks(verse.text, verse.reference)
        const n = chunkList.length
        const movableArr = pickReorderMovableIndices(n, r, seed)
        const rng = seedRandom(stringToSeed(`${seed}-mem-reorder-assign-r${r}`))
        const assignment = buildInitialReorderSlotAssignment(n, movableArr, rng)
        if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setRoundIndex(r)
          setHasTypedInRound(false)
          setReorderSlotChunkIds(assignment)
          setReorderRoundMovableIndices(new Set(movableArr))
          setHiddenIndices(new Set())
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setConsecutiveWrong(0)
          setAwaitingRoundAdvance(false)
          setRoundAffirmation('')
          setPhase('practicing')
          setPracticeMode('reorder')
        })
      } else {
        const hidden = hiddenTypingTokenIndices(
          modeRaw,
          r,
          sessionSeedRef.current || verse.id,
          typableIndices
        )
        if (memorizeAndroidHost) androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setRoundIndex(r)
          setHasTypedInRound(false)
          setHiddenIndices(hidden)
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setConsecutiveWrong(0)
          setAwaitingRoundAdvance(false)
          setRoundAffirmation('')
          setPhase('practicing')
          setPracticeMode(modeRaw)
        })
      }
    }
    requestAnimationFrame(() => {
      if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      if (isKeyboardPracticeMode(ip.practiceMode ?? 'type')) {
        practiceInputRef.current?.focus({ preventScroll: true })
      }
    })
  }, [memorizeAndroidHost, verse.id, verse.text, verse.reference, verse.inProgressPractice, typableIndices])

  /**
   * Scroll the active blank within the practice column, then nudge so it stays visible. **Type mode**
   * uses `visualViewport` so blanks sit above the soft keyboard. **Word mode** uses the scroll pane’s
   * bounds so blanks stay above the pinned choice strip below. We avoid
   * `scrollIntoView({ block: 'center' })` on iOS: it centers in the scroll box and ignores the keyboard,
   * so the viewport nudge then scrolls the other way — a visible down-then-up. Android already used
   * min-scroll + instant nudge + double measure to avoid IME jitter; iOS now matches the instant nudge.
   */
  const scrollCurrentBlankIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const root =
        practiceWordsWordRef.current ?? practiceWordsTypeRef.current
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
      const scrollRect = scrollEl.getBoundingClientRect()
      const vv = window.visualViewport
      const edgeMargin = 12
      const isWordMode = practiceModeRef.current === 'word'
      let viewTop: number
      let viewBottom: number
      if (isWordMode) {
        // Scroll area ends above the pinned word-choice strip; keep blanks inside that region only.
        viewTop = scrollRect.top + edgeMargin
        viewBottom = scrollRect.bottom - edgeMargin
      } else if (vv) {
        viewTop = vv.offsetTop + edgeMargin
        viewBottom =
          vv.offsetTop + vv.height - edgeMargin - MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX
      } else {
        viewTop = scrollRect.top + edgeMargin
        viewBottom = scrollRect.bottom - edgeMargin
      }
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
   * Skip when the interaction started on **Hint** so hold-to-peek and pointer capture work on desktop.
   */
  const keepPracticeInputOnPointerCapture = useCallback((e: PointerEvent | TouchEvent) => {
    if (awaitingRoundAdvanceRef.current) return
    if (!isKeyboardPracticeMode(practiceModeRef.current)) return
    const t = e.target
    if (t instanceof Element && t.closest('[data-testid="memorize-hint-button"]')) {
      return
    }
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
    if (phase !== 'practicing' || !isKeyboardPracticeMode(practiceMode)) return
    const el = practiceWordsTypeRef.current
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
  }, [phase, practiceMode, keepPracticeInputOnPointerCapture])

  useLayoutEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || !isKeyboardPracticeMode(practiceMode)) return
    const el = hintButtonRef.current
    if (!el) return
    el.addEventListener('touchstart', keepPracticeInputOnPointerCapture, { capture: true, passive: false })
    el.addEventListener('pointerdown', keepPracticeInputOnPointerCapture, { capture: true })
    return () => {
      el.removeEventListener('touchstart', keepPracticeInputOnPointerCapture, { capture: true })
      el.removeEventListener('pointerdown', keepPracticeInputOnPointerCapture, { capture: true })
    }
  }, [phase, awaitingRoundAdvance, practiceMode, keepPracticeInputOnPointerCapture])

  /** After releasing Hint, WebKit may leave focus on the button — put it back on the hidden field. */
  const restorePracticeInputFocusAfterHint = useCallback(() => {
    requestAnimationFrame(() => {
      if (awaitingRoundAdvanceRef.current) return
      if (phase !== 'practicing') return
      if (!isKeyboardPracticeMode(practiceModeRef.current)) return
      practiceInputRef.current?.focus({ preventScroll: true })
    })
  }, [phase])

  const beginPracticeWithMode = useCallback(
    (mode: MemorizationPracticeMode) => {
      stopPassageAudio()
      setModePickerOpen(false)
      completedRef.current = false
      sessionSeedRef.current = generateMemorizationSessionSeed()
      practiceModeRef.current = mode
      const r = Math.min(
        MEMORIZATION_FULL_HIDE_ROUND,
        Math.max(1, Math.floor(startRoundChoice))
      )
      flushSync(() => {
        setPracticeMode(mode)
        startRound(r)
      })
      if (practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      if (isKeyboardPracticeMode(mode)) {
        practiceInputRef.current?.focus({ preventScroll: true })
      }
      onPersistInProgress?.({
        sessionSeed: sessionSeedRef.current,
        wrongAttempts: 0,
        correctKeystrokes: 0,
        phase: { kind: 'inRound', roundIndex: r },
        practiceMode: mode,
      })
    },
    [onPersistInProgress, startRound, startRoundChoice, stopPassageAudio]
  )

  /** flushSync + optional focus keeps iOS / Capacitor WebView keyboard in the same user gesture as type-mode start. */
  const startRoundAndFocusInput = useCallback(
    (r: number) => {
      flushSync(() => {
        startRound(r)
      })
      // Intro and practice share this column; scrolling the long intro to reach "Start practice"
      // must not leave a non-zero scrollTop when the inner content swaps to the round UI.
      if (practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      if (isKeyboardPracticeMode(practiceModeRef.current)) {
        practiceInputRef.current?.focus({ preventScroll: true })
      }
    },
    [startRound]
  )

  const persistPracticeSnapshot = useCallback(
    (phasePayload: MemorizationInProgressSavePayload['phase']) => {
      if (!onPersistInProgress || !sessionSeedRef.current) return
      const mode = practiceModeRef.current ?? 'type'
      onPersistInProgress({
        sessionSeed: sessionSeedRef.current,
        wrongAttempts: wrongAttemptsRef.current,
        correctKeystrokes: correctKeystrokesRef.current,
        phase: phasePayload,
        practiceMode: mode,
      })
    },
    [onPersistInProgress]
  )

  const handleClose = useCallback(() => {
    setListenPanelOpen(false)
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
    setListenPanelOpen(false)
    stopPassageAudio()
    onClearInProgress?.()
    sessionSeedRef.current = ''
    completedRef.current = false
    roundAdvanceHandledRef.current = null
    openedLayoutOnceForVerseIdRef.current = null
    lastVerseIdForLayoutRef.current = verse.id
    startTransition(() => {
      setPhase('intro')
      setStartRoundChoice(1)
      setRoundIndex(0)
      setHasTypedInRound(false)
      setHiddenIndices(new Set())
      setRevealed(new Set())
      setFirstLetterCueRevealedSlots(new Set())
      setReorderSlotChunkIds([])
      setReorderRoundMovableIndices(new Set())
      setWrongAttemptsTotal(0)
      setCorrectKeystrokesTotal(0)
      setAwaitingRoundAdvance(false)
      setRoundAffirmation('')
      setCompletionMessage('')
      setPracticeMode(null)
      setModePickerOpen(false)
    })
  }, [verse.id, onClearInProgress, stopPassageAudio])

  /** Stops ESV + TTS listen when leaving intro, between rounds, or when complete — not only on manual buttons. */
  useEffect(() => {
    if (awaitingRoundAdvance || phase !== 'intro') {
      stopPassageAudio()
    }
  }, [awaitingRoundAdvance, phase, stopPassageAudio])

  const handlePassageAudioPlay = useCallback(() => {
    const el = passageAudioRef.current
    if (el) {
      applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
    }
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
      applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
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
    memorizeListenTtsUserPausedRef.current = false
    memorizeListenTtsPostResumeRef.current = false
    const syn = window.speechSynthesis
    memorizeWebSpeechUtteranceIsOursRef.current = false
    syn.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    const rate = listenPlaybackRateRef.current
    u.rate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost())
    memorizeListenTtsRateAtStartRef.current = rate
    u.onstart = () => {
      memorizeWebSpeechUtteranceIsOursRef.current = true
      memorizeListenTtsPostResumeRef.current = false
      bumpListen()
    }
    u.onend = () => {
      memorizeWebSpeechUtteranceIsOursRef.current = false
      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false
      memorizeListenTtsRateAtStartRef.current = null
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
      memorizeWebSpeechUtteranceIsOursRef.current = false
      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false
      memorizeListenTtsRateAtStartRef.current = null
      bumpListen()
    }
    syn.speak(u)
    bumpListen()
  }, [bumpListen, clearListenRepeatGapTimer, memorizeAndroidHost, verse])

  const handleListenPassageClick = useCallback(() => {
    if (!listenInteractionAllowed) {
      return
    }
    if (listenViaEsvPassageUrl) {
      const el = passageAudioRef.current
      if (!el) return
      if (!el.paused) {
        clearListenRepeatGapTimer()
        el.pause()
        setPassageAudioPlaying(false)
        bumpListen()
        queueMicrotask(bumpListen)
        return
      }
      void (async () => {
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
            window.speechSynthesis.cancel()
          }
          memorizeWebSpeechUtteranceIsOursRef.current = false
          el.src = memorizePassageAudioUrl
          applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
          await el.play()
          setPassageAudioPlaying(true)
          bumpListen()
          requestAnimationFrame(bumpListen)
        } catch {
          setPassageAudioPlaying(false)
          bumpListen()
        }
      })()
      return
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }
    const syn = window.speechSynthesis
    if (syn.speaking) {
      if (!memorizeWebSpeechUtteranceIsOursRef.current) {
        memorizeListenTtsUserPausedRef.current = false
        memorizeListenTtsPostResumeRef.current = false
        syn.cancel()
        beginTtsUtterance()
        bumpListen()
        queueMicrotask(bumpListen)
        return
      }
      if (syn.paused) {
        memorizeListenTtsUserPausedRef.current = false
        const atStart = memorizeListenTtsRateAtStartRef.current
        if (atStart != null && listenPlaybackRateRef.current !== atStart) {
          syn.cancel()
          memorizeListenTtsRateAtStartRef.current = null
          memorizeListenTtsPostResumeRef.current = false
          beginTtsUtterance()
        } else {
          memorizeListenTtsPostResumeRef.current = true
          syn.resume()
          window.setTimeout(bumpListen, 24)
          window.setTimeout(bumpListen, 72)
        }
      } else {
        memorizeListenTtsUserPausedRef.current = true
        memorizeListenTtsPostResumeRef.current = false
        syn.pause()
      }
      bumpListen()
      queueMicrotask(bumpListen)
      return
    }
    beginTtsUtterance()
  }, [
    beginTtsUtterance,
    bumpListen,
    clearListenRepeatGapTimer,
    listenInteractionAllowed,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
  ])

  const handleRepeatListenToggle = useCallback(() => {
    if (!listenInteractionAllowed) {
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
              if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
                window.speechSynthesis.cancel()
              }
              memorizeWebSpeechUtteranceIsOursRef.current = false
              el.src = memorizePassageAudioUrl
              el.currentTime = 0
              applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
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
      } else if (!memorizeWebSpeechUtteranceIsOursRef.current) {
        window.speechSynthesis.cancel()
        beginTtsUtterance()
      }
    } else {
      clearListenRepeatGapTimer()
    }
    bumpListen()
  }, [
    beginTtsUtterance,
    bumpListen,
    clearListenRepeatGapTimer,
    listenInteractionAllowed,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
  ])

  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance) return

    if (practiceMode === 'reorder') {
      const n = reorderChunks.length
      if (n === 0 || reorderSlotChunkIds.length !== n) return
      if (!reorderSlotChunkIds.every((id, i) => id === i)) return
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
      return
    }

    if (hiddenIndices.size === 0) return
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
  }, [
    phase,
    awaitingRoundAdvance,
    practiceMode,
    reorderChunks,
    reorderSlotChunkIds,
    hiddenIndices,
    revealed,
    roundIndex,
    onComplete,
    onPersistInProgress,
    persistPracticeSnapshot,
  ])

  const processWordGuess = useCallback(
    (picked: string) => {
      if (hintActive) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return

      setHasTypedInRound(true)

      const correct = picked === token.text

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

  const handleReorderInvalidDrop = useCallback(() => {
    setWrongAttemptsTotal((w) => w + 1)
    setFlashError(true)
    window.setTimeout(() => setFlashError(false), 120)
  }, [])

  const handleReorderSlotsBecameCorrect = useCallback((slots: number[]) => {
    if (slots.length === 0) return
    setCorrectKeystrokesTotal((c) => c + slots.length)
  }, [])

  const wordChoiceLabels = useMemo(() => {
    if (practiceMode !== 'word') return []
    if (phase !== 'practicing' || awaitingRoundAdvance) return []
    if (currentTargetIndex === null) return []
    const seed = sessionSeedRef.current
    if (!seed) return []
    const rng = seedRandom(
      stringToSeed(`${seed}-mem-word-r${roundIndex}-t${currentTargetIndex}`)
    )
    const targetTok = currentTargetIndex !== null ? tokens[currentTargetIndex] : null
    const choiceCount =
      targetTok?.kind === 'digit'
        ? MEMORIZATION_WORD_CHOICE_COUNT_DIGIT
        : MEMORIZATION_WORD_CHOICE_COUNT_WORD
    return buildMemorizationChoiceLabels(
      tokens,
      typableIndices,
      currentTargetIndex,
      choiceCount,
      rng
    )
  }, [
    practiceMode,
    phase,
    awaitingRoundAdvance,
    currentTargetIndex,
    roundIndex,
    tokens,
    typableIndices,
  ])

  const processKeystroke = useCallback(
    (key: string) => {
      if (hintActive) return
      if (phase !== 'practicing' || currentTargetIndex === null) return
      if (key.length !== 1) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return

      const maybeRevealCueAfterCorrectTypable = (tokenIndex: number) => {
        if (practiceModeRef.current !== 'firstLetters') return
        const slot = typableIndices.indexOf(tokenIndex)
        if (slot < 0) return
        const cueHidden = firstLetterCueHiddenSlotsRef.current
        if (!cueHidden.has(slot)) return
        setFirstLetterCueRevealedSlots((prev) => {
          if (prev.has(slot)) return prev
          const next = new Set(prev)
          next.add(slot)
          return next
        })
      }

      setHasTypedInRound(true)

      if (token.kind === 'digit') {
        if (!/^[0-9]$/.test(key)) return
        const correct = key === token.text
        if (correct) {
          const idx = currentTargetIndex
          maybeRevealCueAfterCorrectTypable(idx)
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
        return
      }

      // Word token: first alphabetic letter only (see `firstLetterOfWord` in utils).
      if (!/^[a-zA-Z]$/.test(key)) return
      const expected = firstLetterOfWord(token.text)
      if (!expected) return
      const correct = key.toLowerCase() === expected

      if (correct) {
        const idx = currentTargetIndex
        maybeRevealCueAfterCorrectTypable(idx)
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
    [phase, currentTargetIndex, tokens, hintActive, typableIndices]
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
    if (
      phase !== 'practicing' ||
      awaitingRoundAdvance ||
      currentTargetIndex === null ||
      hintActive ||
      !isKeyboardPracticeMode(practiceMode)
    ) {
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
    phase,
    awaitingRoundAdvance,
    roundIndex,
    currentTargetIndex,
    hintActive,
    practiceMode,
    hasTypedInRound,
    scrollCurrentBlankIntoView,
  ])

  /** Word mode: pinned choice strip below — scroll verse whenever the active blank changes. */
  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    if (practiceMode !== 'word') return
    scrollCurrentBlankIntoView()
  }, [
    phase,
    awaitingRoundAdvance,
    currentTargetIndex,
    roundIndex,
    practiceMode,
    scrollCurrentBlankIntoView,
    wordChoiceLabels.length,
  ])

  /** Type mode: after first keystroke, keep the active blank in view as it advances. */
  useEffect(() => {
    if (phase !== 'practicing' || awaitingRoundAdvance || currentTargetIndex === null) return
    if (practiceMode === 'word') return
    if (!hasTypedInRound) return
    scrollCurrentBlankIntoView()
  }, [
    phase,
    awaitingRoundAdvance,
    currentTargetIndex,
    roundIndex,
    hasTypedInRound,
    scrollCurrentBlankIntoView,
    practiceMode,
  ])

  /** When the keyboard resizes the visual viewport, re-nudge so the current blank stays above it (keyboard modes). */
  useEffect(() => {
    if (!isKeyboardPracticeMode(practiceMode)) return
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
    practiceMode,
  ])

  useEffect(() => {
    if (!listenInteractionAllowed) {
      setListenPanelOpen(false)
    }
  }, [listenInteractionAllowed])

  useEffect(() => {
    if (listenPanelOpen) {
      bumpListen()
    }
  }, [bumpListen, listenPanelOpen])

  /** Clear post-resume hint once `speechSynthesis` reports unpaused (or flush stuck state). */
  useEffect(() => {
    void listenUiTick
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (!memorizeListenTtsPostResumeRef.current) return
    const syn = window.speechSynthesis
    if (syn.speaking && !syn.paused) {
      memorizeListenTtsPostResumeRef.current = false
      bumpListen()
    }
  }, [bumpListen, listenUiTick])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (modePickerOpen) {
        setModePickerOpen(false)
        return
      }
      if (listenPanelOpen) {
        setListenPanelOpen(false)
        return
      }
      handleClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [handleClose, listenPanelOpen, modePickerOpen])

  const showStartOver =
    typeof onClearInProgress === 'function' &&
    (phase === 'practicing' || (phase === 'intro' && !!verse.inProgressPractice))

  if (typableIndices.length === 0) {
    return (
      <div
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Memorize practice"
      >
        <div
          data-tour="memorize-practice-dialog"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-600"
        >
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

  const showListenOpeners = listenInteractionAllowed

  return (
    <>
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Memorize practice"
    >
      <div
        data-tour="memorize-practice-dialog"
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-600 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-600 shrink-0">
          <div className="flex min-w-0 shrink items-center gap-2">
            {showListenOpeners && (
              <button
                type="button"
                data-tour="memorize-listen-open"
                data-testid="memorize-listen-open"
                onClick={() => {
                  setListenPanelOpen(true)
                }}
                aria-expanded={listenPanelOpen}
                aria-controls={MEMORIZE_LISTEN_CONTROLS_DIALOG_ID}
                aria-label="Open Listen controls for this verse"
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Listen
              </button>
            )}
            {onOpenSpurgeonStudy && (
              <button
                type="button"
                data-tour="memorize-practice-spurgeon-study"
                data-testid="memorize-practice-spurgeon-study"
                disabled={
                  !verse.reference.trim() ||
                  spurgeonStudyMatch === 'loading' ||
                  spurgeonStudyMatch === 'unset' ||
                  spurgeonStudyMatch === 'no'
                }
                onClick={() => {
                  const ref = verse.reference.trim()
                  if (!ref || spurgeonStudyMatch !== 'yes') return
                  handleClose()
                  onOpenSpurgeonStudy(ref)
                }}
                title={
                  !verse.reference.trim()
                    ? 'Open a passage to search study resources'
                    : spurgeonStudyMatch === 'loading' || spurgeonStudyMatch === 'unset'
                      ? 'Checking indexed study resources…'
                      : spurgeonStudyMatch === 'no'
                        ? 'No indexed study resources for this passage'
                        : 'Search Spurgeon, devotions, and Calvin commentaries for this passage'
                }
                aria-label={
                  !verse.reference.trim()
                    ? 'Study: no passage selected'
                    : spurgeonStudyMatch === 'loading' || spurgeonStudyMatch === 'unset'
                      ? 'Study: checking indexed resources'
                      : spurgeonStudyMatch === 'no'
                        ? 'Study: no indexed resources for this passage'
                        : 'Study: indexed resources for this passage'
                }
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                  !verse.reference.trim() ||
                  spurgeonStudyMatch === 'loading' ||
                  spurgeonStudyMatch === 'unset' ||
                  spurgeonStudyMatch === 'no'
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Study
              </button>
            )}
          </div>
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
            {phase === 'practicing' &&
              !awaitingRoundAdvance &&
              (practiceMode === 'type' ||
                practiceMode === 'firstLetters' ||
                practiceMode === 'word' ||
                practiceMode === 'reorder') && (
              <button
                ref={hintButtonRef}
                type="button"
                data-testid="memorize-hint-button"
                tabIndex={-1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600 active:bg-blue-200 dark:active:bg-blue-900/70 select-none touch-manipulation"
                aria-pressed={hintActive}
                aria-label={
                  practiceMode === 'reorder'
                    ? 'Hold to peek at the correct phrase for the first section still out of order'
                    : 'Hold to peek at hidden words; adds the next word every second'
                }
                title={
                  practiceMode === 'reorder'
                    ? 'Hold to peek at the first wrong section'
                    : 'Hold to peek; next blank every 1s while held'
                }
                onPointerDown={(e) => {
                  e.preventDefault()
                  setHintPeekCount(1)
                  setHintHeld(true)
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId)
                  } catch {
                    /* e.g. pointer type unsupported */
                  }
                }}
                onPointerUp={(e) => {
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    }
                  } catch {
                    /* ignore */
                  }
                  setHintPeekCount(1)
                  setHintHeld(false)
                  restorePracticeInputFocusAfterHint()
                }}
                onPointerLeave={(e) => {
                  if (e.buttons !== 0) return
                  setHintPeekCount(1)
                  setHintHeld(false)
                  restorePracticeInputFocusAfterHint()
                }}
                onPointerCancel={(e) => {
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    }
                  } catch {
                    /* ignore */
                  }
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
          {phase === 'practicing' && isKeyboardPracticeMode(practiceMode) && memorizeAndroidHost && (
            <input
              id={practiceInputDomId}
              ref={assignPracticeInputRef}
              type="text"
              inputMode={currentTargetToken?.kind === 'digit' ? 'numeric' : 'text'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              disabled={awaitingRoundAdvance}
              aria-label="Type the first letter of each blank word, or each digit for number blanks. In Initials mode, dots in the initials row fill in when you type correctly."
              data-testid="memorize-practice-input"
              tabIndex={awaitingRoundAdvance ? -1 : 0}
              className="pointer-events-none fixed top-[25vh] left-1/2 z-110 h-10 w-32 max-w-[min(12rem,45vw)] -translate-x-1/2 border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
              onKeyDown={handlePracticeInputKeyDown}
              onInput={handlePracticeInput}
            />
          )}
          {phase !== 'done' && listenViaEsvPassageUrl && (
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
          {phase === 'intro' ? (
            <>
              <div
                ref={practiceScrollRef}
                className="relative px-4 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y"
              >
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <strong>Start practice</strong> when you{"'"}re ready; <strong>Round</strong> sets where you begin in the
                    five-round run (1 is easiest).
                  </p>
                  <p
                    className="text-base leading-relaxed text-slate-900 dark:text-slate-100 font-serif"
                    data-testid="memorize-intro-text"
                  >
                    {formatMemorizationTokensPlain(tokens)}
                  </p>
                </div>
              </div>
              <div
                className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-900/60"
                data-testid="memorize-intro-footer"
              >
                <div className="flex min-w-0 flex-nowrap items-stretch gap-3">
                  <button
                    type="button"
                    data-tour="memorize-start-practice"
                    onClick={() => {
                      setModePickerOpen(true)
                    }}
                    className="min-w-0 flex-1 px-4 py-3 text-center sm:flex-none sm:w-auto sm:shrink-0 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    Start practice
                  </button>
                  <div className="w-38 shrink-0 min-w-0 sm:w-auto sm:max-w-48 sm:shrink-0 self-stretch flex items-stretch">
                    <ScriptureModalToolbarMenu
                      value={String(startRoundChoice)}
                      options={MEMORIZE_INTRO_START_ROUND_OPTIONS}
                      onSelect={(v) => {
                        setStartRoundChoice(Number(v))
                      }}
                      ariaLabel="Starting round (1 to 5)"
                      listboxAriaLabel="Choose starting round"
                      triggerClassName="h-12.5 min-h-[50px] w-full min-w-0"
                      portaledListbox
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              ref={practiceScrollRef}
              className={`relative isolate bg-white dark:bg-slate-800 px-4 pt-0 pb-4 flex-1 min-h-0 overscroll-y-contain touch-pan-y ${
                phase === 'done'
                  ? 'overflow-y-hidden flex flex-col justify-center'
                  : 'overflow-y-auto'
              }`}
              style={
                keyboardInsetPx > 0
                  ? { paddingBottom: `calc(${keyboardInsetPx}px + 0.5rem)` }
                  : undefined
              }
            >
          {phase === 'practicing' && isKeyboardPracticeMode(practiceMode) && !memorizeAndroidHost && (
            <input
              id={practiceInputDomId}
              ref={assignPracticeInputRef}
              type="text"
              inputMode={currentTargetToken?.kind === 'digit' ? 'numeric' : 'text'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              disabled={awaitingRoundAdvance}
              aria-label="Type the first letter of each blank word, or each digit for number blanks. In Initials mode, dots in the initials row fill in when you type correctly."
              data-testid="memorize-practice-input"
              tabIndex={awaitingRoundAdvance ? -1 : 0}
              className="absolute left-0 top-0 z-0 h-px w-full max-w-full border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
              onKeyDown={handlePracticeInputKeyDown}
              onInput={handlePracticeInput}
            />
          )}
          {phase === 'practicing' && (
            <div>
              <div
                className={
                  practiceMode === 'firstLetters' && !awaitingRoundAdvance
                    ? 'sticky top-0 z-20 -mx-4 mb-2 border-b border-slate-200 bg-white px-4 pt-4 pb-2 shadow-[0_6px_12px_-8px_rgba(15,23,42,0.35)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_8px_16px_-10px_rgba(0,0,0,0.65)]'
                    : 'pt-4 mb-2'
                }
              >
                <div className={practiceMode === 'firstLetters' && !awaitingRoundAdvance ? 'mb-2' : ''}>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {awaitingRoundAdvance ? (
                      <>
                        Round {roundIndex} complete — repeat or continue to round {roundIndex + 1}.
                      </>
                    ) : practiceMode === 'reorder' ? (
                      <>
                        Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — reorder about{' '}
                        {reorderMovableCountForRound(roundIndex, reorderChunks.length)} of {reorderChunks.length} parts.
                      </>
                    ) : practiceMode === 'firstLetters' ? (
                      <>
                        Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — initials:{' '}
                        {firstLetterCueHiddenSlots.size} of {typableIndices.length} hidden.
                      </>
                    ) : (
                      <>
                        Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — about{' '}
                        {Math.round(hiddenFractionForRound(roundIndex) * 100)}% hidden
                      </>
                    )}
                  </p>
                </div>
                {practiceMode === 'firstLetters' && !awaitingRoundAdvance && (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      Cues below line up with blanks in order (first letter of each word or each reference digit); dots
                      hide cues until you type the right key.{' '}
                      {currentTargetIndex !== null &&
                        (currentTargetToken?.kind === 'digit'
                          ? 'Type digits only; colons and dashes are not typed.'
                          : 'Type first letters. Hold Hint to peek (one more blank each second).')}
                      {currentTargetIndex !== null && ' '}
                      Tap the verse if the keyboard closes.
                    </p>
                    <div
                      ref={firstLetterCuesViewportRef}
                      className="min-h-0 max-h-[calc(3*1.625*1em)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y rounded-sm px-2 font-mono text-base sm:text-lg font-bold leading-relaxed tracking-wide text-slate-900 dark:text-slate-100 [-webkit-overflow-scrolling:touch]"
                      aria-label="Initials cues (three lines visible; scrolls with the active blank)"
                    >
                      <p
                        className="mb-0 break-all sm:wrap-break-word"
                        aria-label="Initials row: one hint character per blank in order; a dot hides a hint until you type that blank's first letter or digit correctly"
                        data-testid="memorize-first-letter-cues"
                      >
                        {typableIndices.map((tokenIndex, slot) => {
                          const t = tokens[tokenIndex]
                          if (!t) return null
                          const hiddenSlot =
                            firstLetterCueHiddenSlots.has(slot) && !firstLetterCueRevealedSlots.has(slot)
                          const glyph = cueGlyphForTypableToken(t)
                          const isActiveCue =
                            currentTargetIndex !== null && tokenIndex === currentTargetIndex
                          return (
                            <span key={`cue-${tokenIndex}-${slot}`} data-memorize-cue-slot={slot}>
                              {slot > 0 ? ' ' : ''}
                              <span
                                className={
                                  isActiveCue
                                    ? 'rounded px-0.5 ring-2 ring-blue-400/90 bg-blue-100 text-blue-950 dark:bg-blue-900/55 dark:text-blue-50 dark:ring-blue-500/80'
                                    : undefined
                                }
                              >
                                {hiddenSlot ? '·' : glyph}
                              </span>
                            </span>
                          )
                        })}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="relative z-0 min-w-0">
              {!awaitingRoundAdvance && practiceMode !== 'firstLetters' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {practiceMode === 'reorder' ? (
                    <>
                      Drag the <strong>highlighted</strong> parts into reading order. Drop a part onto another highlighted part—fixed parts stay put. Hold <strong>Hint</strong> to peek
                      at what belongs in the first slot that is still wrong.
                    </>
                  ) : practiceMode === 'word' ? (
                    <>
                      {currentTargetIndex !== null &&
                        (currentTargetToken?.kind === 'digit'
                          ? 'Tap the digit in the choice bar at the bottom that fills the next blank (left to right).'
                          : 'Tap the word in the bottom choice bar that fills the next blank (left to right). Hold Hint to peek; another blank appears every second while you hold.')}
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
              {practiceMode === 'reorder' ? (
                <MemorizationReorderPanel
                  chunks={reorderChunks}
                  slotChunkIds={reorderSlotChunkIds}
                  onSlotChunkIdsChange={setReorderSlotChunkIds}
                  roundMovableIndices={reorderRoundMovableIndices}
                  onInvalidDrop={handleReorderInvalidDrop}
                  onSlotsBecameCorrect={handleReorderSlotsBecameCorrect}
                  listFlashError={flashError}
                  holdHintPeekFirstWrong={
                    practiceMode === 'reorder' && hintActive
                  }
                  scrollParentRef={practiceScrollRef}
                  colonAfterSlotIndex={reorderColonAfterSlotIndex}
                />
              ) : practiceMode === 'word' ? (
                <>
                  <div
                    ref={practiceWordsWordRef}
                    role="group"
                    aria-label="Verse practice area"
                    className={`touch-manipulation text-base leading-relaxed font-serif flex flex-wrap gap-x-2 gap-y-2.5 sm:gap-x-1 sm:gap-y-2 items-baseline rounded-md p-1 ring-2 ring-inset transition-shadow ${
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
                          className={`inline-flex items-baseline border-b-2 box-border px-1 sm:px-0.5 min-h-[1.5em] min-w-[0.6em] justify-center ${
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
                </>
              ) : (
                <label
                  ref={practiceWordsTypeRef}
                  htmlFor={practiceInputDomId}
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
                    const input = practiceInputRef.current
                    if (!input) return
                    input.focus({ preventScroll: true })
                    window.setTimeout(() => {
                      if (document.activeElement !== input) input.focus({ preventScroll: true })
                    }, 0)
                  }}
                  className={`touch-manipulation cursor-text text-base leading-relaxed font-serif flex flex-wrap gap-x-2 gap-y-2.5 sm:gap-x-1 sm:gap-y-2 items-baseline rounded-md p-1 ring-2 ring-inset transition-shadow ${
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
                        className={`inline-flex items-baseline border-b-2 box-border px-1 sm:px-0.5 min-h-[1.5em] min-w-[0.6em] justify-center ${
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
                </label>
              )}
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
          )}

          {phase === 'practicing' &&
            practiceMode === 'word' &&
            !awaitingRoundAdvance &&
            wordChoiceLabels.length > 0 && (
              <div
                className="shrink-0 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60"
                data-testid="memorize-word-choices"
              >
                <div className="max-h-[min(42vh,360px)] overflow-y-auto overscroll-y-contain px-4 py-3 touch-pan-y">
                  <div className="flex w-full max-w-2xl mx-auto flex-wrap justify-center gap-4">
                    {wordChoiceLabels.map((label, choiceIdx) => (
                      <button
                        key={`${label}-${choiceIdx}`}
                        type="button"
                        onClick={() => processWordGuess(label)}
                        className={
                          currentTargetToken?.kind === 'digit'
                            ? 'shrink-0 min-w-11 px-4 py-2.5 sm:px-3 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base font-medium tabular-nums whitespace-nowrap text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                            : 'max-w-full w-max shrink-0 px-4 py-3 sm:px-3 sm:py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium text-center leading-snug whitespace-normal wrap-anywhere hyphens-auto hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
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

    {modePickerOpen && phase === 'intro' && (
      <div
        className="fixed inset-0 z-110 flex items-center justify-center bg-black/40 dark:bg-black/50 p-4"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) setModePickerOpen(false)
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modePickerTitleId}
          data-tour="memorize-practice-mode-picker"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id={modePickerTitleId}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4"
          >
            Choose practice mode
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            <strong>Type mode:</strong> keyboard — first letter of each blank word and each reference digit.{' '}
            <strong>Initials mode:</strong> same typing as Type; all blanks every round; higher rounds replace more
            initials with dots on the cue row—typing correctly reveals your hidden dots there too.{' '}
            <strong>Word mode:</strong> tap choices in the bottom bar (no keyboard).{' '}
            <strong>Reorder mode:</strong> drag chunks into reading order.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              data-tour="memorize-practice-mode-type"
              data-testid="memorize-practice-mode-type"
              onClick={() => beginPracticeWithMode('type')}
              className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
            >
              Type mode
            </button>
            <button
              type="button"
              data-tour="memorize-practice-mode-initials"
              data-testid="memorize-practice-mode-initials"
              onClick={() => beginPracticeWithMode('firstLetters')}
              className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
            >
              Initials mode
            </button>
            <button
              type="button"
              data-tour="memorize-practice-mode-word"
              data-testid="memorize-practice-mode-word"
              onClick={() => beginPracticeWithMode('word')}
              className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
            >
              Word mode
            </button>
            <button
              type="button"
              data-tour="memorize-practice-mode-reorder"
              data-testid="memorize-practice-mode-reorder"
              onClick={() => beginPracticeWithMode('reorder')}
              className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
            >
              Reorder mode
            </button>
            <button
              type="button"
              data-testid="memorize-practice-mode-cancel"
              onClick={() => setModePickerOpen(false)}
              className="w-full px-4 py-3 rounded-lg font-medium border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {listenPanelOpen && showListenOpeners && (
      <MemorizeListenControlsDialog
        open
        onClose={() => {
          setListenPanelOpen(false)
        }}
        dialogId={MEMORIZE_LISTEN_CONTROLS_DIALOG_ID}
        titleId={MEMORIZE_LISTEN_CONTROLS_TITLE_ID}
        onPrimaryClick={handleListenPassageClick}
        primaryLabel={readAloudDialogPrimaryLabel}
        primaryAriaLabel={readAloudDialogPrimaryAriaLabel}
        primaryAriaPressed={listenAriaPressed}
        repeatListenOn={repeatListenOn}
        onRepeatToggle={handleRepeatListenToggle}
        listenPlaybackRate={listenPlaybackRate}
        onSelectSpeed={(r) => {
          setListenPlaybackRate(r)
          writeMemorizeListenSpeedToStorage(r)
          bumpListen()
        }}
      />
    )}
    </>
  )
}
