'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  formatStrongsChipLabel,
  normalizeStepBibleWordFields,
  normalizeStrongsForLookup,
} from '@/lib/step-bible-text'
import { wordStudyLanguageLabelFromPassageKey } from '@/lib/step-bible-reference'
import type { StepBibleLexiconResult, StepBibleWord, StepBibleWordStudyResult } from '@/lib/step-bible-types'

interface ScriptureWordStudyPanelProps {
  reference: string
  /** When false, skips fetch and renders nothing. Modal shell sets true while open. */
  enabled?: boolean
  /** True when rendered inside ScriptureWordStudyModal (overlay over verse text). */
  embedded?: boolean
}

type LexiconState =
  | { status: 'idle' }
  | { status: 'loading'; strongs: string }
  | { status: 'ready'; strongs: string; entry: StepBibleLexiconResult }
  | { status: 'error'; strongs: string; message: string }

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
}: {
  reference: string
  embedded?: boolean
}) {
  const [study, setStudy] = useState<StepBibleWordStudyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedStrongs, setExpandedStrongs] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<StepBibleWord | null>(null)
  const [lexicon, setLexicon] = useState<LexiconState>({ status: 'idle' })
  const [detail, setDetail] = useState<'brief' | 'full'>('brief')

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

  const lookupStrongs = (raw: string) => normalizeStrongsForLookup(raw)?.key ?? null

  const onWordClick = (raw: StepBibleWord) => {
    const word = normalizeStepBibleWordFields(raw)
    const key = lookupStrongs(word.strongs)
    if (key && expandedStrongs === key) {
      setExpandedStrongs(null)
      setSelectedWord(null)
      setLexicon({ status: 'idle' })
      return
    }
    setSelectedWord(word)
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
    const detailLevel = study?.language === 'heb' ? 'brief' : detail
    if (study?.language === 'heb' && detail !== 'brief') setDetail('brief')
    void loadLexicon(key, detailLevel)
  }

  const langLabel = study
    ? wordStudyLanguageLabelFromPassageKey(study.language, study.passageKey)
    : 'Original'
  const lexiconOpen = Boolean(expandedStrongs || selectedWord)

  const lexiconDetail = lexiconOpen ? (
    <div className="p-3 bg-white dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {expandedStrongs ? (
          <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
            {expandedStrongs}
          </span>
        ) : (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {selectedWord?.gloss ?? selectedWord?.text ?? 'Word'}
          </span>
        )}
        {study?.language === 'heb' && (
          <span className="text-xs text-slate-500 dark:text-slate-400">TBESH (brief)</span>
        )}
        {study?.language === 'grc' && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setDetail('brief')
                void loadLexicon(expandedStrongs!, 'brief')
              }}
              className={`text-xs px-2 py-0.5 rounded border ${
                detail === 'brief'
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                  : 'border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300'
              }`}
            >
              Brief
            </button>
            <button
              type="button"
              onClick={() => {
                setDetail('full')
                void loadLexicon(expandedStrongs!, 'full')
              }}
              className={`text-xs px-2 py-0.5 rounded border ${
                detail === 'full'
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                  : 'border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300'
              }`}
            >
              Full
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setExpandedStrongs(null)
            setSelectedWord(null)
            setLexicon({ status: 'idle' })
          }}
          className="ml-auto text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-lg leading-none px-1"
          aria-label="Close definition"
        >
          ×
        </button>
      </div>
      {lexicon.status === 'loading' && (
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading definition…</p>
      )}
      {lexicon.status === 'error' &&
        (lexicon.strongs === expandedStrongs || (!expandedStrongs && selectedWord)) && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{lexicon.message}</p>
        )}
      {lexicon.status === 'ready' && lexicon.strongs === expandedStrongs && (
        <div className="text-sm text-slate-800 dark:text-slate-200 space-y-2.5 max-h-[38vh] overflow-y-auto">
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
            className="scripture-word-study-lexicon-sheet absolute inset-x-0 bottom-0 z-20 max-h-[min(48vh,360px)] overflow-y-auto rounded-t-xl border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-[0_-10px_28px_rgba(0,0,0,0.28)] dark:shadow-[0_-10px_28px_rgba(0,0,0,0.5)]"
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
}: ScriptureWordStudyPanelProps) {
  const fetchKey = enabled && reference.trim() ? reference.trim() : null
  if (!fetchKey) return null

  return (
    <ScriptureWordStudyPanelContent
      key={fetchKey}
      reference={fetchKey}
      embedded={embedded}
    />
  )
}
