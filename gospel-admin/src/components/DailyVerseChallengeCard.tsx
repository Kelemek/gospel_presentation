'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DailyVerseHuntSuccessContent } from '@/components/DailyVerseHuntSuccessContent'
import { GOSPEL_CLIENT_STORAGE_CHANGED_EVENT } from '@/lib/gospelClientStorageEvents'
import { DEVICE_SYNC_STATE_CHANGED_EVENT } from '@/lib/gospelDeviceSync/dirty'
import {
  DAILY_VERSE_CHALLENGE_STORAGE_KEY,
  formatMaskedReference,
  stripLeadingVerseNumberMarker,
  getLocalDateKey,
  getPromptAtIndex,
  getPromptIndexForDate,
  getTodayDailyVerseHuntEncouragementMessage,
  getTodayPrompt,
  loadDailyVerseChallengeCompletion,
  loadDailyVersePrompts,
  normalizePromptIndex,
  type DailyVersePrompt,
} from '@/lib/dailyVerseChallenge'

function subscribeDailyVerseCompletion(onStoreChange: () => void): () => void {
  const onClientStorageChanged = (event: Event) => {
    const key = (event as CustomEvent<{ key: string }>).detail?.key
    if (key === DAILY_VERSE_CHALLENGE_STORAGE_KEY) {
      onStoreChange()
    }
  }
  const onDeviceSyncStateChanged = () => {
    onStoreChange()
  }
  window.addEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
  window.addEventListener(DEVICE_SYNC_STATE_CHANGED_EVENT, onDeviceSyncStateChanged)
  return () => {
    window.removeEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
    window.removeEventListener(DEVICE_SYNC_STATE_CHANGED_EVENT, onDeviceSyncStateChanged)
  }
}

function getDailyVerseCompletionSnapshot(): string {
  const stored = loadDailyVerseChallengeCompletion()
  if (!stored) return ''
  return `${stored.dateKey}:${stored.promptId}`
}

type ScriptureApiResponse = {
  text?: string
  error?: string
}

type DailyVerseChallengeCardProps = {
  completedVersion: number
  /** Logged-in admins can step through prompt types with prev/next. */
  isAdmin?: boolean
}

function CollapseChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
    >
      <svg
        className="w-5 h-5 text-blue-800 dark:text-blue-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </span>
  )
}

export default function DailyVerseChallengeCard({
  completedVersion,
  isAdmin = false,
}: DailyVerseChallengeCardProps) {
  const prompts = useMemo(() => loadDailyVersePrompts(), [])
  const previewEnabled = isAdmin
  const [previewIndex, setPreviewIndex] = useState(() =>
    getPromptIndexForDate(prompts)
  )
  const [isExpanded, setIsExpanded] = useState(false)

  const prompt = previewEnabled
    ? getPromptAtIndex(prompts, previewIndex)
    : getTodayPrompt(prompts)

  const completionSnapshot = useSyncExternalStore(
    subscribeDailyVerseCompletion,
    getDailyVerseCompletionSnapshot,
    () => ''
  )

  const completed =
    !previewEnabled &&
    prompt != null &&
    completionSnapshot === `${getLocalDateKey()}:${prompt.id}`

  const encouragementMessage = completed
    ? getTodayDailyVerseHuntEncouragementMessage()
    : null

  const maskedReference =
    prompt != null
      ? formatMaskedReference(prompt.reference, prompt.mask.reference)
      : null

  if (!prompt) {
    return null
  }

  const navigatePreview = (delta: number) => {
    setPreviewIndex((index) =>
      normalizePromptIndex(index + delta, prompts.length)
    )
  }

  const collapsedSubtitle = completed ? (
    <p className="text-sm font-medium leading-tight text-blue-900 dark:text-blue-100 truncate">
      <span className="text-green-600 dark:text-green-400" aria-hidden="true">
        ✓{' '}
      </span>
      {prompt.reference}
    </p>
  ) : (
    <p className="text-base font-semibold leading-tight text-blue-900 dark:text-blue-100 truncate">
      {maskedReference}
    </p>
  )

  return (
    <section
      data-tour="daily-verse-challenge"
      className="mb-4 rounded-md border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/40 px-3 py-2 shadow-sm transition-colors duration-200 hover:bg-blue-200/90 dark:hover:bg-blue-800/55 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
      aria-label="Daily Verse Hunt"
    >
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          className="flex flex-1 min-w-0 flex-col rounded-md px-1 py-0.5 text-left cursor-pointer"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse Daily Verse Hunt' : 'Expand Daily Verse Hunt'}
        >
          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            Daily Verse Hunt
          </h4>
          {collapsedSubtitle}
        </button>
        <div className="flex shrink-0 flex-col items-center self-stretch justify-center py-0.5">
          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            className="shrink-0 p-0.5 rounded text-blue-800 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-200/80 dark:hover:bg-blue-800/60 transition-colors cursor-pointer"
            aria-hidden="true"
            tabIndex={-1}
          >
            <CollapseChevron expanded={isExpanded} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-2 pt-2 border-t border-blue-200/80 dark:border-blue-700/80 space-y-2">
          {completed ? (
            <CompletedChallengeBody
              encouragementMessage={encouragementMessage ?? ''}
              reference={prompt.reference}
            />
          ) : (
            <ActiveChallengeBody
              key={`${prompt.id}-${completedVersion}-${previewEnabled ? previewIndex : 'today'}`}
              prompt={prompt}
            />
          )}

          {previewEnabled ? (
            <div
              className="pt-2 border-t border-blue-200/80 dark:border-blue-700/80 flex items-center justify-between gap-2"
              data-tour="daily-verse-challenge-admin-preview"
            >
              <button
                type="button"
                onClick={() => navigatePreview(-1)}
                className="p-1 rounded text-blue-800 dark:text-blue-200 hover:bg-blue-200/80 dark:hover:bg-blue-800/60 transition-colors cursor-pointer"
                aria-label="Previous Daily Verse Hunt prompt"
                title="Previous prompt"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-[10px] leading-tight text-center text-blue-700/90 dark:text-blue-300/90 min-w-0">
                <span className="font-medium">{prompt.kind}</span>
                <span className="mx-1">·</span>
                <span className="break-all">{prompt.id}</span>
                <span className="mx-1">·</span>
                {previewIndex + 1}/{prompts.length}
              </p>
              <button
                type="button"
                onClick={() => navigatePreview(1)}
                className="p-1 rounded text-blue-800 dark:text-blue-200 hover:bg-blue-200/80 dark:hover:bg-blue-800/60 transition-colors cursor-pointer"
                aria-label="Next Daily Verse Hunt prompt"
                title="Next prompt"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function useDailyVerseEsvText(reference: string) {
  const [verseText, setVerseText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const params = new URLSearchParams({
      reference,
      translation: 'esv',
    })

    fetch(`/api/scripture?${params.toString()}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as ScriptureApiResponse
        if (cancelled) return
        if (!response.ok || !data.text) {
          setFetchError(data.error ?? 'Could not load verse text')
          return
        }
        setVerseText(data.text)
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('Could not load verse text')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reference])

  const displayText = useMemo(() => {
    if (!verseText) return null
    return stripLeadingVerseNumberMarker(verseText)
  }, [verseText])

  return { displayText, loading, fetchError }
}

function CompletedChallengeBody({
  encouragementMessage,
  reference,
}: {
  encouragementMessage: string
  reference: string
}) {
  const { displayText, loading } = useDailyVerseEsvText(reference)

  return (
    <DailyVerseHuntSuccessContent
      encouragementMessage={encouragementMessage}
      reference={reference}
      verseText={loading ? null : displayText}
    />
  )
}

function ActiveChallengeBody({ prompt }: { prompt: DailyVersePrompt }) {
  const { displayText, loading, fetchError } = useDailyVerseEsvText(prompt.reference)

  return (
    <div className="space-y-1 text-blue-800 dark:text-blue-200">
      {loading ? (
        <p className="text-sm leading-snug text-blue-700/80 dark:text-blue-300/80 animate-pulse">
          Loading today&apos;s verse…
        </p>
      ) : null}

      {!loading && displayText ? (
        <p className="text-sm leading-snug">
          {displayText}
          <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 whitespace-nowrap">
            {'\u00a0'}(ESV)
          </span>
        </p>
      ) : null}

      {!loading && fetchError && !displayText ? (
        <p className="text-sm leading-snug text-blue-900 dark:text-blue-100">{fetchError}</p>
      ) : null}

      <p className="text-[11px] leading-snug text-blue-700/90 dark:text-blue-300/90">
        Find this passage in the Bible reader.
      </p>
    </div>
  )
}
