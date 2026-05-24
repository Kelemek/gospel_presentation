'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'
import {
  formatStrongsChipLabel,
  normalizeStepBibleWordFields,
  normalizeStrongsForLookup,
} from '@/lib/step-bible-text'
import { wordStudyLanguageLabelFromPassageKey } from '@/lib/step-bible-reference'
import { dedupeConcordanceOccurrencesByPassage } from '@/lib/step-bible-concordance-dedupe'
import type {
  StepBibleConcordanceOccurrence,
  StepBibleLexiconResult,
  StepBibleWord,
  StepBibleWordStudyResult,
} from '@/lib/step-bible-types'

interface ScriptureWordStudyPanelProps {
  reference: string
  /** When false, skips fetch and renders nothing. Modal shell sets true while open. */
  enabled?: boolean
  /** True when rendered inside ScriptureWordStudyModal (overlay over verse text). */
  embedded?: boolean
  /** Open a verse in the parent ScriptureModal (concordance links). */
  onOpenReference?: (reference: string) => void
}

type LexiconDetail = 'brief' | 'full' | 'concordance'

type LexiconState =
  | { status: 'idle' }
  | { status: 'loading'; strongs: string }
  | { status: 'ready'; strongs: string; entry: StepBibleLexiconResult }
  | { status: 'error'; strongs: string; message: string }

type ConcordanceState =
  | { status: 'idle' }
  | { status: 'loading'; strongs: string }
  | {
      status: 'ready'
      strongs: string
      total: number
      /** Raw occurrence rows fetched from the API (pagination offset). */
      fetchedCount: number
      occurrences: ReturnType<typeof dedupeConcordanceOccurrencesByPassage>
    }
  | { status: 'error'; strongs: string; message: string }

const CONCORDANCE_PAGE_SIZE = 50

function WordStudyFieldLabel({ children }: { children: string }) {
  return (
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </span>
  )
}

function WordStudyLabeledField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-0.5 ${className}`.trim()}>
      <WordStudyFieldLabel>{label}</WordStudyFieldLabel>
      {children}
    </div>
  )
}

function ScriptureWordStudyPanelContent({
  reference,
  embedded = false,
  onOpenReference,
}: {
  reference: string
  embedded?: boolean
  onOpenReference?: (reference: string) => void
}) {
  const [study, setStudy] = useState<StepBibleWordStudyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedStrongs, setExpandedStrongs] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<StepBibleWord | null>(null)
  const [lexicon, setLexicon] = useState<LexiconState>({ status: 'idle' })
  const [concordance, setConcordance] = useState<ConcordanceState>({ status: 'idle' })
  const [detail, setDetail] = useState<LexiconDetail>('brief')

  const currentPassageKeys = useMemo(() => {
    if (!study) return new Set<string>()
    const keys = (study.verses ?? []).map((v) => v.passageKey)
    if (study.passageKey) keys.push(study.passageKey)
    return new Set(keys)
  }, [study])

  useEffect(() => {
    let cancelled = false

    fetch(`/api/scripture/word-study?reference=${encodeURIComponent(reference)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          const message =
            typeof data.error === 'string'
              ? data.error
              : typeof data.unavailableReason === 'string'
                ? data.unavailableReason
                : 'Failed to load word study'
          setError(message)
          setStudy(null)
          return
        }
        setStudy(data as StepBibleWordStudyResult)
        const sections = Array.isArray(data.verses) ? data.verses : []
        const hasWords =
          sections.some((s: { words?: unknown[] }) => s.words?.length) ||
          (data.words?.length ?? 0) > 0
        if (data.unavailableReason && !hasWords) {
          setError(
            typeof data.unavailableReason === 'string'
              ? data.unavailableReason
              : 'No words available for this passage.'
          )
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load word study')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reference])

  const loadLexicon = useCallback(
    async (strongs: string, detailLevel: 'brief' | 'full') => {
      setLexicon({ status: 'loading', strongs })
      try {
        const res = await fetch(
          `/api/scripture/lexicon?strongs=${encodeURIComponent(strongs)}&detail=${detailLevel}`,
          { cache: 'no-store' }
        )
        const data = await res.json()
        if (!res.ok) {
          setLexicon({
            status: 'error',
            strongs,
            message: typeof data.error === 'string' ? data.error : 'Lexicon lookup failed',
          })
          return
        }
        setLexicon({ status: 'ready', strongs, entry: data as StepBibleLexiconResult })
      } catch {
        setLexicon({ status: 'error', strongs, message: 'Lexicon lookup failed' })
      }
    },
    []
  )

  const loadConcordance = useCallback(async (strongs: string, offset = 0, append = false) => {
    if (!append) {
      setConcordance({ status: 'loading', strongs })
    }
    try {
      const res = await fetch(
        `/api/scripture/concordance?strongs=${encodeURIComponent(strongs)}&offset=${offset}&limit=${CONCORDANCE_PAGE_SIZE}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) {
        setConcordance({
          status: 'error',
          strongs,
          message: typeof data.error === 'string' ? data.error : 'Concordance lookup failed',
        })
        return
      }
      const page = (data.occurrences ?? []) as StepBibleConcordanceOccurrence[]
      const total = typeof data.total === 'number' ? data.total : page.length
      setConcordance((prev) => {
        if (append && prev.status === 'ready' && prev.strongs === strongs) {
          const fetchedCount = prev.fetchedCount + page.length
          return {
            status: 'ready',
            strongs,
            total,
            fetchedCount,
            occurrences: dedupeConcordanceOccurrencesByPassage([...prev.occurrences, ...page]),
          }
        }
        return {
          status: 'ready',
          strongs,
          total,
          fetchedCount: page.length,
          occurrences: dedupeConcordanceOccurrencesByPassage(page),
        }
      })
    } catch {
      setConcordance({ status: 'error', strongs, message: 'Concordance lookup failed' })
    }
  }, [])

  const lookupStrongs = (raw: string) => normalizeStrongsForLookup(raw)?.key ?? null

  const closeLexiconSheet = () => {
    setExpandedStrongs(null)
    setSelectedWord(null)
    setLexicon({ status: 'idle' })
    setConcordance({ status: 'idle' })
    setDetail('brief')
  }

  const onWordClick = (raw: StepBibleWord) => {
    const word = normalizeStepBibleWordFields(raw)
    const key = lookupStrongs(word.strongs)
    if (key && expandedStrongs === key) {
      closeLexiconSheet()
      return
    }
    setSelectedWord(word)
    setConcordance({ status: 'idle' })
    if (!key) {
      setExpandedStrongs(null)
      setLexicon({
        status: 'error',
        strongs: '',
        message:
          'No Strong’s number for this token. The English gloss on the chip is from STEP word data only.',
      })
      return
    }
    setExpandedStrongs(key)
    setDetail('brief')
    void loadLexicon(key, 'brief')
  }

  const concordanceCountLabel =
    concordance.status === 'ready' && concordance.strongs === expandedStrongs
      ? ` (${concordance.total})`
      : ''

  const tabButtonClass = (active: boolean) =>
    `text-xs px-2 py-0.5 rounded border ${
      active
        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
        : 'border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300'
    }`

  const langLabel = study
    ? wordStudyLanguageLabelFromPassageKey(study.language, study.passageKey)
    : 'Original'
  const lexiconOpen = Boolean(expandedStrongs || selectedWord)

  const lexiconDetail = lexiconOpen ? (
    <div className="flex flex-col min-h-0 h-full bg-white dark:bg-slate-800">
      <div className="sticky top-0 z-10 shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
        {expandedStrongs ? (
          <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
            {expandedStrongs}
          </span>
        ) : (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {selectedWord?.gloss ?? selectedWord?.text ?? 'Word'}
          </span>
        )}
        {study?.language === 'heb' && detail === 'brief' && (
          <span className="text-xs text-slate-500 dark:text-slate-400">TBESH (brief)</span>
        )}
        {expandedStrongs && (
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setDetail('brief')
                void loadLexicon(expandedStrongs, 'brief')
              }}
              className={tabButtonClass(detail === 'brief')}
            >
              Brief
            </button>
            {study?.language === 'grc' && (
              <button
                type="button"
                onClick={() => {
                  setDetail('full')
                  void loadLexicon(expandedStrongs, 'full')
                }}
                className={tabButtonClass(detail === 'full')}
              >
                Full
              </button>
            )}
            <button
              type="button"
              data-tour="scripture-modal-word-study-concordance"
              onClick={() => {
                setDetail('concordance')
                if (
                  concordance.status !== 'ready' ||
                  concordance.strongs !== expandedStrongs
                ) {
                  void loadConcordance(expandedStrongs, 0, false)
                }
              }}
              className={tabButtonClass(detail === 'concordance')}
            >
              Concordance{concordanceCountLabel}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={closeLexiconSheet}
          className="ml-auto inline-flex h-9 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-md text-2xl leading-none text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Close definition"
        >
          ×
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
      {detail !== 'concordance' && lexicon.status === 'loading' && (
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading definition…</p>
      )}
      {detail !== 'concordance' &&
        lexicon.status === 'error' &&
        (lexicon.strongs === expandedStrongs || (!expandedStrongs && selectedWord)) && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{lexicon.message}</p>
        )}
      {detail !== 'concordance' &&
        lexicon.status === 'ready' &&
        lexicon.strongs === expandedStrongs && (
          <div className="text-sm text-slate-800 dark:text-slate-200 space-y-2.5">
            {lexicon.entry.lemma && (
              <WordStudyLabeledField label="Lemma">
                <p
                  className={`text-slate-900 dark:text-slate-100 ${
                    study?.language === 'heb'
                      ? 'text-lg font-serif text-left'
                      : 'text-base'
                  }`}
                  dir={study?.language === 'heb' ? 'rtl' : 'ltr'}
                >
                  {lexicon.entry.lemma}
                </p>
              </WordStudyLabeledField>
            )}
            {lexicon.entry.transliteration && (
              <WordStudyLabeledField label="Transliteration">
                <p
                  className="text-sm text-slate-600 dark:text-slate-400 italic text-left"
                  dir="ltr"
                >
                  {lexicon.entry.transliteration}
                </p>
              </WordStudyLabeledField>
            )}
            {lexicon.entry.gloss && (
              <WordStudyLabeledField label="Gloss">
                <p className="font-medium text-slate-700 dark:text-slate-300">{lexicon.entry.gloss}</p>
              </WordStudyLabeledField>
            )}
            {lexicon.entry.definition &&
              (detail === 'full' ||
                study?.language === 'heb' ||
                (detail === 'brief' && !lexicon.entry.gloss)) && (
                <WordStudyLabeledField label="Definition">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                    {lexicon.entry.definition}
                  </p>
                </WordStudyLabeledField>
              )}
            {lexicon.entry.note && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">{lexicon.entry.note}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-600">
              Source: {lexicon.entry.source} ({lexicon.entry.detail})
            </p>
          </div>
        )}
      {detail === 'concordance' && concordance.status === 'loading' && (
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading concordance…</p>
      )}
      {detail === 'concordance' &&
        concordance.status === 'error' &&
        concordance.strongs === expandedStrongs && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{concordance.message}</p>
        )}
      {detail === 'concordance' &&
        concordance.status === 'ready' &&
        concordance.strongs === expandedStrongs && (
          <div className="text-sm">
            <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
              {concordance.occurrences.map((occ) => {
                const isCurrent = currentPassageKeys.has(occ.passageKey)
                return (
                  <li key={occ.passageKey}>
                    <ScriptureHoverModal reference={occ.reference} hoverDelayMs={500} inline>
                      <button
                        type="button"
                        onClick={() => onOpenReference?.(occ.reference)}
                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors cursor-pointer min-h-[44px] flex flex-col justify-center ${
                          isCurrent
                            ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100 font-medium'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                      >
                        <span className="font-medium">{occ.reference}</span>
                        {occ.gloss && (
                          <span className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {occ.gloss}
                          </span>
                        )}
                      </button>
                    </ScriptureHoverModal>
                  </li>
                )
              })}
            </ul>
            {concordance.fetchedCount < concordance.total && (
              <button
                type="button"
                onClick={() =>
                  void loadConcordance(concordance.strongs, concordance.fetchedCount, true)
                }
                className="mt-2 w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Load more ({concordance.fetchedCount} of {concordance.total})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null

  const wordSections = (
    <>
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          {embedded ? `Original language (${langLabel})` : `Word study (${langLabel})`}
        </h3>
        {study?.stepRef && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{study.stepRef}</span>
        )}
      </div>

      {loading && (
        <p className="text-sm text-slate-600 dark:text-slate-300 py-2">Loading original-language words…</p>
      )}
      {error && !loading && (
        <p className="text-sm text-amber-700 dark:text-amber-300 py-2">{error}</p>
      )}
      {!loading &&
        study?.verses?.map((section) =>
          section.words.length > 0 ? (
            <div key={section.passageKey} className="mb-4 last:mb-0">
              {study.verses.length > 1 && (
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 font-mono">
                  Verse {section.verse}
                  <span className="font-normal text-slate-500 dark:text-slate-500 ml-2">
                    {section.stepRef}
                  </span>
                </p>
              )}
              <ul className="flex flex-wrap gap-2 list-none p-0 m-0 items-stretch">
                {section.words.map((raw) => {
                  const word = normalizeStepBibleWordFields(raw)
                  const active = expandedStrongs === lookupStrongs(word.strongs)
                  const isHeb = study.language === 'heb'
                  const strongsChip = formatStrongsChipLabel(word.strongs)
                  return (
                    <li
                      key={`${section.verse}-${word.position}-${word.strongs}`}
                      className="flex"
                    >
                      <button
                        type="button"
                        onClick={() => onWordClick(raw)}
                        className={`cursor-pointer text-left rounded-lg border px-2 py-1.5 min-w-18 max-w-44 w-full flex-1 min-h-22 flex flex-col transition-colors ${
                          active
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/40'
                            : 'border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                        aria-expanded={active}
                        aria-label={
                          [
                            word.text,
                            word.transliteration,
                            word.gloss,
                            strongsChip.primary,
                          ]
                            .filter(Boolean)
                            .join(', ')
                        }
                      >
                        <span
                          className={`block shrink-0 text-lg leading-snug text-slate-900 dark:text-slate-100 ${
                            isHeb ? 'font-serif text-left' : ''
                          }`}
                          dir={isHeb ? 'rtl' : 'ltr'}
                        >
                          {word.text}
                        </span>
                        {word.transliteration ? (
                          <span className="block shrink-0 text-xs leading-4 text-slate-600 dark:text-slate-300 italic wrap-break-word">
                            {word.transliteration}
                          </span>
                        ) : (
                          <span className="block shrink-0 min-h-4 text-xs leading-4 invisible" aria-hidden>
                            {'\u00a0'}
                          </span>
                        )}
                        <span
                          className={`block shrink-0 min-h-8 text-xs leading-snug text-slate-600 dark:text-slate-400 wrap-break-word whitespace-normal ${
                            word.gloss ? '' : 'invisible'
                          }`}
                          aria-hidden={!word.gloss}
                        >
                          {word.gloss || '\u00a0'}
                        </span>
                        <span
                          className="block shrink-0 text-xs font-mono text-blue-700 dark:text-blue-300 break-all leading-snug"
                          title={strongsChip.title}
                        >
                          {strongsChip.primary}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null
        )}
    </>
  )

  if (embedded) {
    return (
      <div className="flex flex-col h-full min-h-0 relative px-3 py-3">
        <div
          className={`flex-1 min-h-0 overflow-y-auto ${lexiconOpen ? 'pb-[min(48vh,360px)]' : ''}`}
        >
          {wordSections}
        </div>
        {lexiconOpen && (
          <div
            data-tour="scripture-modal-word-study-lexicon"
            className="scripture-word-study-lexicon-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[min(48vh,360px)] flex-col overflow-hidden rounded-t-xl border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-[0_-10px_28px_rgba(0,0,0,0.28)] dark:shadow-[0_-10px_28px_rgba(0,0,0,0.5)]"
            role="region"
            aria-label="Lexicon definition"
          >
            {lexiconDetail}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
      {wordSections}
      {lexiconDetail}
    </div>
  )
}

export default function ScriptureWordStudyPanel({
  reference,
  enabled = true,
  embedded = false,
  onOpenReference,
}: ScriptureWordStudyPanelProps) {
  const fetchKey = enabled && reference.trim() ? reference.trim() : null
  if (!fetchKey) return null

  return (
    <ScriptureWordStudyPanelContent
      key={fetchKey}
      reference={fetchKey}
      embedded={embedded}
      onOpenReference={onOpenReference}
    />
  )
}
