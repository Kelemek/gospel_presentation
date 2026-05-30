'use client'

import { useCallback, useState } from 'react'
import { logger } from '@/lib/logger'

interface GitHubFeedbackSettingsState {
  github_feedback_enabled: boolean
  github_repo_owner: string
  github_repo_name: string
  github_token_masked: string
  has_github_token: boolean
}

export default function GitHubFeedbackSettings() {
  const [sectionExpanded, setSectionExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [testError, setTestError] = useState('')

  const [enabled, setEnabled] = useState(false)
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenMasked, setTokenMasked] = useState('')
  const [hasToken, setHasToken] = useState(false)

  const applySettings = useCallback((data: GitHubFeedbackSettingsState) => {
    setEnabled(data.github_feedback_enabled)
    setRepoOwner(data.github_repo_owner)
    setRepoName(data.github_repo_name)
    setTokenMasked(data.github_token_masked)
    setHasToken(data.has_github_token)
    setTokenInput('')
  }, [])

  const loadConfiguration = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/admin/github-feedback', { cache: 'no-store' })
      const data = (await res.json()) as GitHubFeedbackSettingsState & { error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load GitHub feedback settings')
      }
      applySettings(data)
    } catch (err) {
      logger.error('[GitHubFeedbackSettings] load error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load GitHub feedback settings')
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
      const res = await fetch('/api/admin/github-feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_feedback_enabled: enabled,
          github_repo_owner: repoOwner,
          github_repo_name: repoName,
          github_token: tokenInput,
        }),
      })
      const data = (await res.json()) as GitHubFeedbackSettingsState & { error?: string; success?: boolean }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save GitHub feedback settings')
      }
      applySettings(data)
      setSuccessMessage('GitHub settings saved successfully!')
      window.setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      logger.error('[GitHubFeedbackSettings] save error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save GitHub feedback settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setTestMessage('')
    setTestError('')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/github-feedback/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_repo_owner: repoOwner,
          github_repo_name: repoName,
          github_token: tokenInput,
        }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string }
      if (data.success) {
        setTestMessage(data.message || 'Successfully connected to GitHub repository')
        window.setTimeout(() => setTestMessage(''), 5000)
      } else {
        setTestError(data.message || data.error || 'Failed to access repository')
      }
    } catch (err) {
      logger.error('[GitHubFeedbackSettings] test error:', err)
      setTestError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const canTest =
    enabled &&
    repoOwner.trim() &&
    repoName.trim() &&
    (tokenInput.trim() || hasToken)

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      <button
        type="button"
        id="github-feedback-settings-trigger"
        className="w-full text-left px-6 sm:px-8 py-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onSectionToggle}
        aria-expanded={sectionExpanded}
        aria-controls="github-feedback-settings-panel"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-blue-600 shrink-0"
              aria-hidden
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub Feedback Settings
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Configure GitHub repository settings for in-app user feedback
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
        <div id="github-feedback-settings-panel" className="border-t border-slate-200 px-6 sm:px-8 py-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600">Loading GitHub feedback settings…</div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="enable-github-feedback"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={isSaving}
                  className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0 disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="enable-github-feedback" className="font-medium text-slate-900 text-sm cursor-pointer">
                    Enable GitHub Feedback
                  </label>
                  <p className="text-xs text-slate-600 mt-1">
                    Allow users to submit feedback as GitHub issues from the Help menu
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="github-repo-owner" className="block text-sm font-medium text-slate-700 mb-2">
                  Repository Owner
                </label>
                <input
                  type="text"
                  id="github-repo-owner"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="e.g., your-github-username"
                  disabled={isSaving || !enabled}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">GitHub username or organization name</p>
              </div>

              <div>
                <label htmlFor="github-repo-name" className="block text-sm font-medium text-slate-700 mb-2">
                  Repository Name
                </label>
                <input
                  type="text"
                  id="github-repo-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g., gospel_presentation"
                  disabled={isSaving || !enabled}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">GitHub repository name</p>
              </div>

              <div>
                <label htmlFor="github-token" className="block text-sm font-medium text-slate-700 mb-2">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  id="github-token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={hasToken ? `Saved token (${tokenMasked})` : 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                  disabled={isSaving || !enabled}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-2">
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Create a personal access token
                  </a>{' '}
                  with repo and issues scopes. Leave blank to keep the saved token.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Security note:</strong> Your GitHub token is stored in the database and is only used from
                  server-side API routes. Never share your token with anyone.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 justify-end">
                <button
                  type="button"
                  onClick={() => void handleTestConnection()}
                  disabled={isSaving || isTestingConnection || !canTest}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
                >
                  {isTestingConnection ? 'Testing…' : 'Test Connection'}
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-3" role="alert">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              ) : null}
              {errorMessage ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              ) : null}
              {testMessage ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3" role="alert">
                  <p className="text-sm text-blue-800">{testMessage}</p>
                </div>
              ) : null}
              {testError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
                  <p className="text-sm text-red-800">{testError}</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
