'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { BibleTranslation } from '@/lib/bible-translations'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  formatMemorizationReciteWhisperPrompt,
  hiddenFractionForRound,
  type MemorizationToken,
} from '@/lib/memorizationPracticeUtils'
import {
  alignRecitation,
  buildReciteDisplaySegments,
  formatReciteSkippedLabels,
  reciteScorePercent,
  type ReciteAlignmentResult,
  type ReciteAlignmentSummary,
  type ReciteDisplaySegment,
} from '@/lib/memorizationReciteAlignment'
import { computeReciteModeAvailable } from '@/lib/memorizationReciteIntegration'
import { useMemorizationRecite } from '@/hooks/useMemorizationRecite'

export type RecitePhase = 'ready' | 'recording' | 'stopping' | 'transcribing' | 'results'

export type ReciteAttemptMetrics = {
  wrong: number
  correct: number
  hadErrors: boolean
}

export type MemorizationRecitePracticeHandle = {
  phase: RecitePhase
  starting: boolean
  showNextRoundOption: boolean
  showFinishOption: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  applyAttemptMetrics: () => void
  prepareClose: () => Promise<void>
  resetAttemptState: () => void
  cancel: () => void
}

type MemorizationRecitePracticeProps = {
  active: boolean
  tokens: MemorizationToken[]
  typableIndices: number[]
  reference: string
  translation: BibleTranslation
  itemId: string
  roundIndex: number
  awaitingRoundAdvance?: boolean
  roundAdvanceHeaderCopy?: string
  isBibleBooks?: boolean
  wrongAttemptsInRound?: number
  roundCompletedWithErrors?: boolean
  strictModeEnabled?: boolean
  isFinalRound?: boolean
  hiddenIndices: Set<number>
  revealed: Set<number>
  hintPeekIndices: Set<number>
  onClearHint?: () => void
  onAttemptMetrics?: (metrics: ReciteAttemptMetrics) => void
  onPhaseChange?: (phase: RecitePhase) => void
  /** Fires when phase or starting state changes so the parent can refresh footer controls. */
  onUiStateChange?: () => void
}

function formatReciteDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const MemorizationRecitePractice = forwardRef<
  MemorizationRecitePracticeHandle,
  MemorizationRecitePracticeProps
>(function MemorizationRecitePractice(props, ref) {
  const {
    active,
    tokens,
    typableIndices,
    reference,
    translation,
    itemId,
    roundIndex,
    awaitingRoundAdvance = false,
    roundAdvanceHeaderCopy = '',
    isBibleBooks = false,
    wrongAttemptsInRound = 0,
    roundCompletedWithErrors = false,
    strictModeEnabled = false,
    isFinalRound = false,
    hiddenIndices,
    revealed,
    hintPeekIndices,
    onClearHint,
    onAttemptMetrics,
    onPhaseChange,
    onUiStateChange,
  } = props

  const recite = useMemorizationRecite()
  const [phase, setPhase] = useState<RecitePhase>('ready')
  const [error, setError] = useState('')
  const [recordingMs, setRecordingMs] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [alignment, setAlignment] = useState<ReciteAlignmentSummary | null>(null)
  const [starting, setStarting] = useState(false)

  const attemptMetricsAppliedRef = useRef(false)
  const alignmentByTokenRef = useRef(new Map<number, ReciteAlignmentResult>())
  const stopGenerationRef = useRef(0)
  const startGenerationRef = useRef(0)
  const inFlightStopRef = useRef<Promise<void> | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    onPhaseChange?.(phase)
  }, [phase, onPhaseChange])

  useEffect(() => {
    onUiStateChange?.()
  }, [phase, starting, onUiStateChange])

  const activeRef = useRef(active)
  activeRef.current = active

  const modeAvailable = useMemo(
    () =>
      computeReciteModeAvailable({
        isBibleBooks,
        reference,
      }),
    [isBibleBooks, reference]
  )

  const pendingAttemptErrors = alignment
    ? alignment.wrongCount + alignment.missingCount
    : 0

  const effectiveRoundErrors = attemptMetricsAppliedRef.current
    ? wrongAttemptsInRound
    : wrongAttemptsInRound + pendingAttemptErrors

  const showNextRoundOption =
    phase === 'results' &&
    !isFinalRound &&
    (() => {
      const hasErrors = roundCompletedWithErrors || pendingAttemptErrors > 0
      if (!hasErrors) return true
      if (effectiveRoundErrors <= 0) return true
      return !strictModeEnabled
    })()

  const showFinishOption =
    phase === 'results' &&
    isFinalRound &&
    (() => {
      if (effectiveRoundErrors <= 0) return true
      return !strictModeEnabled
    })()

  const scoreSummary = useMemo(() => {
    if (!alignment) return ''
    const pct = reciteScorePercent(alignment)
    const base = `${alignment.correctCount} of ${alignment.totalTypable} words correct (${pct}%)`
    const skippedLabels = formatReciteSkippedLabels(tokens, alignment.results)
    if (skippedLabels.length > 0) {
      return `${base} · ${skippedLabels.length} skipped`
    }
    return base
  }, [alignment, tokens])

  const skippedWordsLabel = useMemo(() => {
    if (!alignment) return null
    const labels = formatReciteSkippedLabels(tokens, alignment.results)
    if (labels.length === 0) return null
    return labels.join(', ')
  }, [alignment, tokens])

  const displaySegments = useMemo(() => buildReciteDisplaySegments(tokens), [tokens])
  const alignedColumns = alignment?.alignedColumns ?? []

  const invalidateStop = useCallback(() => {
    stopGenerationRef.current += 1
    startGenerationRef.current += 1
    setStarting(false)
  }, [])

  const isStartCurrent = useCallback((startGeneration: number) => {
    return startGeneration === startGenerationRef.current && activeRef.current
  }, [])

  const isStopCurrent = useCallback((stopGeneration: number) => {
    const currentPhase = phaseRef.current
    return (
      stopGeneration === stopGenerationRef.current &&
      (currentPhase === 'stopping' || currentPhase === 'transcribing')
    )
  }, [])

  const showViaHint = useCallback(
    (i: number) => hintPeekIndices.has(i),
    [hintPeekIndices]
  )

  const tokenShowsBlank = useCallback(
    (i: number) => {
      const token = tokens[i]
      if (!token || token.kind === 'punct') return false
      const status = alignmentByTokenRef.current.get(i)?.status
      if (phaseRef.current === 'results' && status === 'missing') return true
      if (phaseRef.current === 'results') return false
      if (showViaHint(i)) return false
      return hiddenIndices.has(i) && !revealed.has(i)
    },
    [tokens, hiddenIndices, revealed, showViaHint]
  )

  const segmentHasHiddenBlank = useCallback(
    (segment: ReciteDisplaySegment) => {
      if (segment.kind === 'punct') return false
      return segment.tokenIndices.some((i) => tokenShowsBlank(i))
    },
    [tokenShowsBlank]
  )

  const segmentFullyBlank = useCallback(
    (segment: ReciteDisplaySegment) => {
      if (segment.kind === 'punct') return false
      return segment.tokenIndices.every((i) => tokenShowsBlank(i))
    },
    [tokenShowsBlank]
  )

  const segmentShowsText = useCallback(
    (segment: ReciteDisplaySegment) => {
      if (segment.kind === 'punct') return true
      return segment.tokenIndices.some((i) => !tokenShowsBlank(i))
    },
    [tokenShowsBlank]
  )

  const segmentShowHint = useCallback(
    (segment: ReciteDisplaySegment) => {
      if (segment.kind === 'punct') return false
      return segment.tokenIndices.some((i) => showViaHint(i))
    },
    [showViaHint]
  )

  const segmentDisplayText = useCallback(
    (segment: ReciteDisplaySegment) => {
      if (segment.kind === 'punct') return segment.text
      if (segmentFullyBlank(segment)) return segment.text
      const i = segment.tokenIndices[0]!
      const token = tokens[i]
      if (!token) return ''
      if (phaseRef.current === 'results') {
        return alignmentByTokenRef.current.get(i)?.spokenText ?? token.text
      }
      return token.text
    },
    [segmentFullyBlank, tokens]
  )

  const applyAttemptMetrics = useCallback(() => {
    if (!alignment || attemptMetricsAppliedRef.current) return
    attemptMetricsAppliedRef.current = true
    const wrong = alignment.wrongCount + alignment.missingCount
    onAttemptMetrics?.({
      wrong,
      correct: alignment.correctCount,
      hadErrors: wrong > 0,
    })
  }, [alignment, onAttemptMetrics])

  const resetAttemptState = useCallback(() => {
    invalidateStop()
    setPhase('ready')
    setError('')
    setTranscript('')
    setAlignment(null)
    alignmentByTokenRef.current = new Map()
    setRecordingMs(0)
    attemptMetricsAppliedRef.current = false
  }, [invalidateStop])

  const runStop = useCallback(async () => {
    const stopGeneration = stopGenerationRef.current
    setError('')
    try {
      const alignmentReference = isBibleBooks ? '' : reference
      const prompt = formatMemorizationReciteWhisperPrompt(tokens, alignmentReference, translation)
      const captured = await recite.stopRecordingCapture()
      if (!isStopCurrent(stopGeneration)) return

      setPhase('transcribing')
      const transcriptText = await recite.transcribeCapturedRecording({
        memorizedItemId: itemId,
        prompt,
        blob: captured.blob,
        audioSeconds: captured.audioSeconds,
      })
      if (!isStopCurrent(stopGeneration)) return

      setTranscript(transcriptText)
      const result = alignRecitation(tokens, typableIndices, transcriptText, alignmentReference)
      alignmentByTokenRef.current = new Map(result.results.map((r) => [r.tokenIndex, r]))
      setAlignment(result)
      setPhase('results')
    } catch (err) {
      if (!isStopCurrent(stopGeneration)) return
      await recite.cancelRecording()
      setPhase('ready')
      setError(err instanceof Error ? err.message : 'Could not check recitation.')
    }
  }, [
    isBibleBooks,
    reference,
    tokens,
    translation,
    recite,
    isStopCurrent,
    itemId,
    typableIndices,
  ])

  const stopRecording = useCallback(async () => {
    if (inFlightStopRef.current) {
      await inFlightStopRef.current
      return
    }
    if (phaseRef.current !== 'recording') return
    setPhase('stopping')
    const stopRun = runStop()
    inFlightStopRef.current = stopRun
    try {
      await stopRun
    } finally {
      if (inFlightStopRef.current === stopRun) {
        inFlightStopRef.current = null
      }
    }
  }, [runStop])

  const startRecording = useCallback(async () => {
    if (starting || phaseRef.current === 'recording' || phaseRef.current === 'stopping' || !active) {
      return
    }

    const startGeneration = ++startGenerationRef.current
    setError('')
    setStarting(true)
    onClearHint?.()

    try {
      if (!modeAvailable) {
        setError('Recite mode is not available.')
        return
      }

      await recite.startRecording({
        onDurationMs: (ms) => setRecordingMs(ms),
        onMaxDurationReached: () => {
          if (phaseRef.current === 'recording') {
            void stopRecording()
          }
        },
      })
      if (!isStartCurrent(startGeneration)) {
        await recite.cancelRecording()
        return
      }
      setPhase('recording')
      setRecordingMs(0)
    } catch (err) {
      if (!isStartCurrent(startGeneration)) {
        await recite.cancelRecording()
        return
      }
      setPhase('ready')
      setError(err instanceof Error ? err.message : 'Could not start recording.')
    } finally {
      if (startGeneration === startGenerationRef.current) {
        setStarting(false)
      }
    }
  }, [starting, active, onClearHint, modeAvailable, recite, isStartCurrent, stopRecording])

  const prepareClose = useCallback(async () => {
    if (
      phaseRef.current === 'recording' ||
      phaseRef.current === 'stopping' ||
      phaseRef.current === 'transcribing'
    ) {
      invalidateStop()
      await recite.cancelRecording()
      setPhase('ready')
      return
    }
    if (phaseRef.current === 'results') {
      applyAttemptMetrics()
    }
  }, [invalidateStop, recite, applyAttemptMetrics])

  const cancel = useCallback(() => {
    invalidateStop()
    void recite.cancelRecording()
  }, [invalidateStop, recite])

  useImperativeHandle(
    ref,
    () => ({
      phase,
      starting,
      showNextRoundOption,
      showFinishOption,
      startRecording,
      stopRecording,
      applyAttemptMetrics,
      prepareClose,
      resetAttemptState,
      cancel,
    }),
    [
      phase,
      starting,
      showNextRoundOption,
      showFinishOption,
      startRecording,
      stopRecording,
      applyAttemptMetrics,
      prepareClose,
      resetAttemptState,
      cancel,
    ]
  )

  if (!active) return null

  return (
    <div className="pt-4" data-testid="memorize-recite-panel">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2" data-testid="memorize-recite-round-header">
        {awaitingRoundAdvance ? (
          roundAdvanceHeaderCopy
        ) : (
          <>
            Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — about{' '}
            {Math.round(hiddenFractionForRound(roundIndex) * 100)}% hidden
          </>
        )}
      </p>
      {phase === 'ready' && (
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          {isBibleBooks ? (
            <>
              Say <strong>all the books in order</strong> from memory. Shown names are cues only.
              Hold Hint to peek at blanks.
            </>
          ) : (
            <>
              Say the <strong>entire</strong> verse and reference from memory. Shown words are cues only.
              Hold Hint to peek at blanks.
            </>
          )}
        </p>
      )}
      {(phase === 'recording' || phase === 'stopping') && (
        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4 animate-pulse">
          Recording… {formatReciteDuration(recordingMs)}
        </p>
      )}
      {phase === 'transcribing' && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Checking your recitation…</p>
      )}
      {phase === 'results' && alignment && (
        <>
          <p
            className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1"
            data-testid="memorize-recite-score"
          >
            {scoreSummary}
          </p>
          {skippedWordsLabel && (
            <p
              className="text-sm text-amber-700 dark:text-amber-400 mb-2"
              data-testid="memorize-recite-skipped"
            >
              Skipped: {skippedWordsLabel}
            </p>
          )}
          {transcript ? (
            <p
              className="text-xs text-slate-500 dark:text-slate-400 mb-4"
              data-testid="memorize-recite-transcript"
            >
              What we heard: {transcript}
            </p>
          ) : (
            <div className="mb-4" />
          )}
        </>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3" data-testid="memorize-recite-error">
          {error}
        </p>
      )}
      {phase === 'results' && alignment ? (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Top: what you said (red = wrong, amber — = skipped). Bottom: correct verse.
          </p>
          <div
            className="touch-manipulation text-base leading-relaxed font-serif flex flex-wrap gap-x-2 gap-y-3 items-end rounded-md p-1"
            data-testid="memorize-recite-aligned-words"
          >
            {alignedColumns.map((col, colIndex) => (
              <div key={colIndex} className="inline-flex flex-col items-center gap-0.5 max-w-[8rem]">
                <span className="inline text-center break-words">
                  {col.spokenChars ? (
                    col.spokenChars.map((sc, scIndex) => (
                      <span
                        key={scIndex}
                        className={
                          sc.status === 'correct'
                            ? 'text-green-700 dark:text-green-400'
                            : sc.status === 'wrong'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {sc.char}
                      </span>
                    ))
                  ) : (
                    <span
                      className={
                        col.spoken?.status === 'correct'
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {col.spoken?.text}
                    </span>
                  )}
                </span>
                {col.expected && (
                  <span
                    className={`inline text-center break-words text-sm border-t border-slate-200 dark:border-slate-600 pt-0.5 w-full text-slate-800 dark:text-slate-100 ${
                      col.expected.status === 'missing' ? 'text-amber-700 dark:text-amber-400' : ''
                    }`}
                  >
                    {col.expected.text}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          className="touch-manipulation text-base leading-relaxed font-serif flex flex-wrap gap-x-0 gap-y-1.5 sm:gap-y-1 items-baseline rounded-md p-1"
          data-testid="memorize-recite-words"
        >
          {displaySegments.map((segment, segmentIndex) => {
            if (segment.kind === 'punct') {
              return (
                <span
                  key={segmentIndex}
                  className="inline text-slate-800 dark:text-slate-100 whitespace-pre"
                >
                  {segment.text}
                </span>
              )
            }
            if (segment.kind === 'digits') {
              return (
                <span
                  key={segmentIndex}
                  className={`inline-flex items-baseline border-b-2 box-border px-0.5 sm:px-0 min-h-[1.5em] justify-center ${
                    segmentHasHiddenBlank(segment)
                      ? 'border-slate-400 dark:border-slate-500'
                      : 'border-transparent'
                  }`}
                >
                  {segment.text.split('').map((char, charIndex) => {
                    const tokenIndex = segment.tokenIndices[charIndex]!
                    const showsBlank = tokenShowsBlank(tokenIndex)
                    const hint = showViaHint(tokenIndex)
                    return (
                      <span
                        key={charIndex}
                        className={
                          showsBlank
                            ? 'text-transparent select-none pointer-events-none'
                            : hint
                              ? 'text-blue-800 dark:text-blue-200 italic'
                              : 'text-slate-800 dark:text-slate-100'
                        }
                        aria-hidden={showsBlank}
                      >
                        {char}
                      </span>
                    )
                  })}
                </span>
              )
            }
            return (
              <span
                key={segmentIndex}
                className={`inline-flex items-baseline border-b-2 box-border px-0.5 sm:px-0 min-h-[1.5em] min-w-[0.6em] justify-center ${
                  segmentHasHiddenBlank(segment)
                    ? 'border-slate-400 dark:border-slate-500'
                    : 'border-transparent'
                }`}
              >
                <span
                  className={
                    segmentFullyBlank(segment)
                      ? 'text-transparent select-none pointer-events-none'
                      : segmentShowHint(segment)
                        ? 'text-blue-800 dark:text-blue-200 italic'
                        : segmentShowsText(segment)
                          ? 'text-slate-800 dark:text-slate-100'
                          : 'text-transparent select-none pointer-events-none'
                  }
                  aria-hidden={segmentFullyBlank(segment)}
                >
                  {segmentDisplayText(segment)}
                </span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
})
