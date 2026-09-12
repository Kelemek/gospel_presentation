'use client'

import { useCallback, useState } from 'react'
import { logger } from '@/lib/logger'

const DEFAULT_NOTION_DATABASE_ID = '5c7d52ea-16a5-4471-914f-cac7baf28add'
const DEFAULT_NOTION_DATABASE_PAGE_ID = '1fc7f85d-baca-4a05-aef5-5c724ce07ecd'

interface NotionFeedbackSettingsState {
  notion_feedback_enabled: boolean
  notion_database_id: string
  notion_token_masked: string
  has_notion_token: boolean
  token_from_env: boolean
}

function NotionMark({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.746-.887l-15.177.887c-.56.047-.749.327-.749.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.695.514.919.747.919 1.4v16.54c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  )
}

export default function NotionFeedbackSettings() {
  const [sectionExpanded, setSectionExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isTestingCreate, setIsTestingCreate] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [testError, setTestError] = useState('')

  const [enabled, setEnabled] = useState(false)
  const [databaseId, setDatabaseId] = useState(DEFAULT_NOTION_DATABASE_ID)
  const [tokenInput, setTokenInput] = useState('')
  const [tokenMasked, setTokenMasked] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [tokenFromEnv, setTokenFromEnv] = useState(false)

  const applySettings = useCallback((data: NotionFeedbackSettingsState) => {
    setEnabled(data.notion_feedback_enabled)
    setDatabaseId(data.notion_database_id || DEFAULT_NOTION_DATABASE_ID)
    setTokenMasked(data.notion_token_masked)
    setHasToken(data.has_notion_token)
    setTokenFromEnv(data.token_from_env)
    setTokenInput('')
  }, [])

  const loadConfiguration = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/admin/notion-feedback', { cache: 'no-store' })
      const data = (await res.json()) as NotionFeedbackSettingsState & { error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load Notion feedback settings')
      }
      applySettings(data)
    } catch (err) {
      logger.error('[NotionFeedbackSettings] load error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load Notion feedback settings')
    } finally {
      setIsLoading(false)
    }
  }, [applySettings])

  const onSectionToggle = () => {
    const next = !sectionExpanded
    setSectionExpanded(next)
    if (next && !initialLoadDone) {
      setInitialLoadDone(true)
      void loadConfiguration()
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSuccessMessage('')
    setErrorMessage('')
    setTestMessage('')
    setTestError('')

    try {
      const res = await fetch('/api/admin/notion-feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notion_feedback_enabled: enabled,
          notion_database_id: databaseId,
          notion_token: tokenInput,
        }),
      })
      const data = (await res.json()) as NotionFeedbackSettingsState & { error?: string; success?: boolean }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Notion feedback settings')
      }
      applySettings(data)
      setSuccessMessage('Notion settings saved successfully!')
      window.setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      logger.error('[NotionFeedbackSettings] save error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save Notion feedback settings')
    } finally {
      setIsSaving(false)
    }
  }

  const runTest = async (action: 'connection' | 'create') => {
    if (action === 'connection') setIsTestingConnection(true)
    else setIsTestingCreate(true)
    setTestMessage('')
    setTestError('')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/notion-feedback/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notion_database_id: databaseId,
          notion_token: tokenInput,
        }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string }
      if (data.success) {
        setTestMessage(
          data.message ||
            (action === 'create'
              ? 'Created a test Site issues row'
              : 'Successfully connected to Notion')
        )
        window.setTimeout(() => setTestMessage(''), 8000)
      } else {
        setTestError(data.message || data.error || 'Notion test failed')
      }
    } catch (err) {
      logger.error('[NotionFeedbackSettings] test error:', err)
      setTestError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (action === 'connection') setIsTestingConnection(false)
      else setIsTestingCreate(false)
    }
  }

  const canTest = Boolean(enabled && databaseId.trim() && (tokenInput.trim() || hasToken))
  const tokenPlaceholder = hasToken
    ? tokenFromEnv
      ? 'Using NOTION_FEEDBACK_TOKEN from the server environment'
      : `Saved token (${tokenMasked})`
    : 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
      <button
        type="button"
        id="notion-feedback-settings-trigger"
        className="w-full text-left px-6 sm:px-8 py-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        onClick={onSectionToggle}
        aria-expanded={sectionExpanded}
        aria-controls="notion-feedback-settings-panel"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <NotionMark className="text-slate-900 dark:text-slate-100 shrink-0" />
            Notion Feedback Settings
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            Send Help menu feedback to the Site issues database in Notion
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
          className={`shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${sectionExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {sectionExpanded ? (
        <div
          id="notion-feedback-settings-panel"
          className="border-t border-slate-200 dark:border-slate-700 px-6 sm:px-8 py-6 space-y-6"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600 dark:text-slate-400">
              Loading Notion feedback settings…
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-600 rounded-lg">
                <input
                  type="checkbox"
                  id="enable-notion-feedback"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={isSaving}
                  className="mt-1 h-4 w-4 text-slate-900 border-slate-300 dark:border-slate-500 rounded focus:ring-slate-500 cursor-pointer shrink-0 disabled:opacity-50"
                />
                <div className="flex-1">
                  <label
                    htmlFor="enable-notion-feedback"
                    className="font-medium text-slate-900 dark:text-slate-100 text-sm cursor-pointer"
                  >
                    Enable Notion Feedback
                  </label>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Allow users to submit feedback from Help → Support as Site issues rows
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notion-database-id"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Database or data source ID
                </label>
                <input
                  type="text"
                  id="notion-database-id"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  placeholder={DEFAULT_NOTION_DATABASE_ID}
                  disabled={isSaving || !enabled}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Use the Site issues ID from the Notion URL (
                  <code className="text-[11px]">{DEFAULT_NOTION_DATABASE_PAGE_ID}</code>) or the data
                  source ID already filled in. Then open Site issues → ••• → Connections and add{' '}
                  <strong>The Gospel Presentation Feedback</strong>. Sharing as a person does not
                  work. Also connect the parent <strong>Gospel Presentation</strong> page.
                </p>
              </div>

              <div>
                <label
                  htmlFor="notion-token"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Integration token
                </label>
                <input
                  type="password"
                  id="notion-token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={tokenPlaceholder}
                  disabled={isSaving || !enabled}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <a
                    href="https://www.notion.so/profile/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Create a Notion internal integration
                  </a>{' '}
                  with insert access to Site issues. Leave blank to keep the saved token or{' '}
                  <code className="text-[11px]">NOTION_FEEDBACK_TOKEN</code> environment variable.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Security note:</strong> The Notion token is stored in the database (or a
                  server environment variable) and is only used from server-side API routes. Never
                  put the token in client code or share it.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 justify-end">
                <button
                  type="button"
                  onClick={() => void runTest('connection')}
                  disabled={isSaving || isTestingConnection || isTestingCreate || !canTest}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 dark:bg-slate-500 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
                >
                  {isTestingConnection ? 'Testing…' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={() => void runTest('create')}
                  disabled={isSaving || isTestingConnection || isTestingCreate || !canTest}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 dark:bg-slate-500 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
                >
                  {isTestingCreate ? 'Creating…' : 'Test Create Row'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
                >
                  {isSaving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>

              {successMessage ? (
                <div
                  className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3"
                  role="alert"
                >
                  <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
                </div>
              ) : null}
              {errorMessage ? (
                <div
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
                  role="alert"
                >
                  <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
                </div>
              ) : null}
              {testMessage ? (
                <div
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
                  role="alert"
                >
                  <p className="text-sm text-blue-800 dark:text-blue-200">{testMessage}</p>
                </div>
              ) : null}
              {testError ? (
                <div
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
                  role="alert"
                >
                  <p className="text-sm text-red-800 dark:text-red-200">{testError}</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
