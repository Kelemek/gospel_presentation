'use client'

import { useCallback, useState } from 'react'
import RichTextEditor from '@/components/RichTextEditor'
import { useAlertModal } from '@/contexts/AlertModalContext'
import {
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
} from '@/lib/biblicalCounseling/biblicalCounselingReference'
import {
  parseSecularTermsInput,
  type SecularTermMapFile,
  type SecularTermMapValidationIssue,
} from '@/lib/biblicalCounseling/secularTermMap'
import { logger } from '@/lib/logger'

type EditableRow = {
  id: string
  biblicalTopic: string
  secularTermsText: string
}

type AdminSecularTermMapResponse = {
  map: SecularTermMapFile
  sectionTitles: string[]
  validationIssues?: SecularTermMapValidationIssue[]
  error?: string
}

function rowsFromMap(map: SecularTermMapFile): EditableRow[] {
  return map.mappings.map((row, index) => ({
    id: `row-${index}-${row.biblicalTopic}`,
    biblicalTopic: row.biblicalTopic,
    secularTermsText: row.secularTerms.join(', '),
  }))
}

function mapFromRows(
  pinnedSectionTitle: string,
  introHtml: string,
  rows: EditableRow[]
): SecularTermMapFile {
  return {
    pinnedSectionTitle,
    introHtml,
    mappings: rows
      .map((row) => ({
        biblicalTopic: row.biblicalTopic.trim(),
        secularTerms: parseSecularTermsInput(row.secularTermsText),
      }))
      .filter((row) => row.biblicalTopic && row.secularTerms.length > 0),
  }
}

let nextRowId = 0
function newRowId(): string {
  nextRowId += 1
  return `new-row-${nextRowId}`
}

/** Include the row's current value when it is not in the loaded section list (e.g. renamed section). */
function biblicalTopicOptionsForRow(rowTopic: string, topicOptions: string[]): string[] {
  const trimmed = rowTopic.trim()
  if (!trimmed) return topicOptions
  const inList = topicOptions.some(
    (title) => title.localeCompare(trimmed, undefined, { sensitivity: 'base' }) === 0
  )
  if (inList) return topicOptions
  return [trimmed, ...topicOptions]
}

const BIBLICAL_TOPIC_SELECT_CLASS =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 appearance-none cursor-pointer bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E\')] bg-size-[1.25rem] bg-position-[right_0.75rem_center] bg-no-repeat pr-10'

export default function SecularTermMapSettings() {
  const { showConfirm } = useAlertModal()
  const [sectionExpanded, setSectionExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [validationIssues, setValidationIssues] = useState<SecularTermMapValidationIssue[]>([])

  const [pinnedSectionTitle, setPinnedSectionTitle] = useState('')
  const [introHtml, setIntroHtml] = useState('')
  const [rows, setRows] = useState<EditableRow[]>([])
  const [sectionTitles, setSectionTitles] = useState<string[]>([])

  const applyLoadedState = useCallback((data: AdminSecularTermMapResponse) => {
    setPinnedSectionTitle(data.map.pinnedSectionTitle)
    setIntroHtml(data.map.introHtml)
    setRows(rowsFromMap(data.map))
    setSectionTitles(data.sectionTitles ?? [])
    setValidationIssues(data.validationIssues ?? [])
  }, [])

  const loadConfiguration = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/admin/biblical-counseling/secular-term-map', { cache: 'no-store' })
      const data = (await res.json()) as AdminSecularTermMapResponse
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load secular term map')
      }
      applyLoadedState(data)
    } catch (err) {
      logger.error('[SecularTermMapSettings] load error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load secular term map')
    } finally {
      setIsLoading(false)
    }
  }, [applyLoadedState])

  const onSectionToggle = () => {
    const next = !sectionExpanded
    setSectionExpanded(next)
    if (next && !initialLoadDone) {
      setInitialLoadDone(true)
      void loadConfiguration()
    }
  }

  const buildPayload = (): SecularTermMapFile =>
    mapFromRows(pinnedSectionTitle, introHtml, rows)

  const handleSave = async () => {
    setIsSaving(true)
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const res = await fetch('/api/admin/biblical-counseling/secular-term-map', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map: buildPayload() }),
      })
      const data = (await res.json()) as AdminSecularTermMapResponse & { success?: boolean }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save secular term map')
      }
      applyLoadedState(data)
      setSuccessMessage('Secular term map saved.')
      window.setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      logger.error('[SecularTermMapSettings] save error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save secular term map')
    } finally {
      setIsSaving(false)
    }
  }

  const applyToProfile = async (slug: string) => {
    setIsApplying(true)
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const res = await fetch('/api/admin/biblical-counseling/secular-term-map/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = (await res.json()) as {
        success?: boolean
        validationIssues?: SecularTermMapValidationIssue[]
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply secular term map')
      }
      setValidationIssues(data.validationIssues ?? [])
      const label = slug === BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG ? 'test profile' : 'production profile'
      setSuccessMessage(`Applied map to ${label} (/${slug}/).`)
      window.setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      logger.error('[SecularTermMapSettings] apply error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to apply secular term map')
    } finally {
      setIsApplying(false)
    }
  }

  const handleApplyTest = () => {
    void applyToProfile(BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG)
  }

  const handleApplyProduction = async () => {
    const confirmed = await showConfirm(
      'Apply to production profile?\n\nThis updates the live Biblical Counseling Scripture Reference profile with the current map from Supabase. Continue?'
    )
    if (!confirmed) return
    void applyToProfile(BIBLICAL_COUNSELING_REFERENCE_SLUG)
  }

  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: newRowId(), biblicalTopic: '', secularTermsText: '' },
    ])
  }

  const topicOptions = sectionTitles.filter(
    (title) => title.trim() && title.trim() !== pinnedSectionTitle.trim()
  )

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      <button
        type="button"
        id="secular-term-map-settings-trigger"
        className="w-full text-left px-6 sm:px-8 py-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onSectionToggle}
        aria-expanded={sectionExpanded}
        aria-controls="secular-term-map-settings-panel"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">
            Biblical Counseling — Secular term map
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Edit secular→biblical topic mappings for in-page search and the pinned reference table
          </p>
        </div>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${sectionExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {sectionExpanded ? (
        <div
          id="secular-term-map-settings-panel"
          className="border-t border-slate-200 px-6 sm:px-8 py-6 space-y-6"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600">
              Loading secular term map…
            </div>
          ) : (
            <>
              {errorMessage ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {errorMessage}
                </div>
              ) : null}
              {successMessage ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  {successMessage}
                </div>
              ) : null}
              {validationIssues.length > 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
                  <p className="font-medium">Unknown biblical topics (no matching section title):</p>
                  <ul className="mt-2 list-disc list-inside">
                    {validationIssues.map((issue) => (
                      <li key={issue.biblicalTopic}>{issue.biblicalTopic}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <label htmlFor="secular-map-intro" className="block text-sm font-medium text-slate-700 mb-2">
                  Intro (pinned section)
                </label>
                <RichTextEditor
                  value={introHtml}
                  onChange={setIntroHtml}
                  multiline
                  placeholder="Introductory text above the mapping table…"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-medium text-slate-700">
                    Mappings ({rows.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addRow}
                    disabled={isSaving || isApplying || topicOptions.length === 0}
                    title={
                      topicOptions.length === 0
                        ? 'Load section titles from the Biblical Counseling profile first'
                        : undefined
                    }
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add mapping row
                  </button>
                </div>
                {topicOptions.length === 0 ? (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    Section titles could not be loaded from the Biblical Counseling profile. Biblical
                    topic choices will appear after the profile is available in Supabase.
                  </p>
                ) : null}
                <div className="max-h-112 overflow-y-auto space-y-4 border border-slate-200 rounded-lg p-4">
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">No mappings yet.</p>
                  ) : (
                    rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] items-start border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Secular terms
                          </label>
                          <textarea
                            value={row.secularTermsText}
                            onChange={(e) => updateRow(row.id, { secularTermsText: e.target.value })}
                            disabled={isSaving || isApplying}
                            rows={2}
                            placeholder="Comma- or line-separated terms"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`secular-map-topic-${row.id}`}
                            className="block text-xs font-medium text-slate-600 mb-1"
                          >
                            Biblical topic
                          </label>
                          <select
                            id={`secular-map-topic-${row.id}`}
                            value={row.biblicalTopic}
                            onChange={(e) => updateRow(row.id, { biblicalTopic: e.target.value })}
                            disabled={isSaving || isApplying || topicOptions.length === 0}
                            className={BIBLICAL_TOPIC_SELECT_CLASS}
                          >
                            <option value="">Select section…</option>
                            {biblicalTopicOptionsForRow(row.biblicalTopic, topicOptions).map(
                              (title) => (
                                <option key={title} value={title}>
                                  {title}
                                  {topicOptions.every(
                                    (t) =>
                                      t.localeCompare(title, undefined, {
                                        sensitivity: 'base',
                                      }) !== 0
                                  )
                                    ? ' (not in profile)'
                                    : ''}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={isSaving || isApplying}
                          className="mt-6 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-end border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={handleApplyTest}
                  disabled={isSaving || isApplying}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isApplying ? 'Applying…' : 'Apply to test profile (/bcsecmap)'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyProduction()}
                  disabled={isSaving || isApplying}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isApplying ? 'Applying…' : 'Apply to production (/26b974ef)'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving || isApplying}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-lg disabled:opacity-50 font-medium"
                >
                  {isSaving ? 'Saving…' : 'Save map'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
