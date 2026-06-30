'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ViewToggle from '@/components/ViewToggle'
import TemplateCard from '@/components/TemplateCard'
import { useViewPreference } from '@/hooks/useViewPreference'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { logger } from '@/lib/logger'
import { shareResourceUrl } from '@/lib/shareResourceUrl'

const templateBlueActionClass =
  'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-300'

export type TemplatesListPanelRole = 'admin'

export interface TemplatesListPanelProps {
  /** When false, list fetch is skipped (parent still loading auth). */
  authReady: boolean
  userRole: TemplatesListPanelRole
  /** True when rendered on /admin dashboard (tweaks empty-state copy). */
  embedded?: boolean
  /** Bump to refetch the template list without leaving the page (e.g. after creating a template). */
  listRefreshKey?: number
  /** Opens the create/clone modal to duplicate a template (admin dashboard / templates page). */
  onCloneTemplate?: (source: { slug: string; title: string }) => void
}

export function TemplatesListPanel({
  authReady,
  userRole,
  embedded = false,
  listRefreshKey = 0,
  onCloneTemplate,
}: TemplatesListPanelProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [error, setError] = useState('')
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const [view, setView] = useViewPreference('list')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const { showAlert, showConfirm } = useAlertModal()

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim()
      let searchChanged = false
      setDebouncedSearch((prev) => {
        searchChanged = prev !== next
        return next
      })
      if (searchChanged) {
        setPage(1)
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const fetchTemplatesPage = useCallback(
    async (opts?: { page?: number }) => {
      const effectivePage = opts?.page ?? page
      try {
        setListLoading(true)
        setError('')
        const params = new URLSearchParams({
          page: String(effectivePage),
          pageSize: String(pageSize),
        })
        if (debouncedSearch) params.set('q', debouncedSearch)
        const response = await fetch(`/api/profiles/templates?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setTemplates(Array.isArray(data.profiles) ? data.profiles : [])
          setTotal(typeof data.total === 'number' ? data.total : 0)
          setTotalPages(Math.max(1, typeof data.totalPages === 'number' ? data.totalPages : 1))
        } else {
          const errBody = await response.json().catch(() => ({}))
          setError(errBody.error || 'Failed to fetch templates')
        }
      } catch (fetchError) {
        console.error('Error fetching templates:', fetchError)
        setError('Error loading templates')
      } finally {
        setListLoading(false)
      }
    },
    [page, pageSize, debouncedSearch]
  )

  useEffect(() => {
    if (!authReady) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      const effectivePage = page
      try {
        setListLoading(true)
        setError('')
        const params = new URLSearchParams({
          page: String(effectivePage),
          pageSize: String(pageSize),
        })
        if (debouncedSearch) params.set('q', debouncedSearch)
        const response = await fetch(`/api/profiles/templates?${params.toString()}`)
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          setTemplates(Array.isArray(data.profiles) ? data.profiles : [])
          setTotal(typeof data.total === 'number' ? data.total : 0)
          setTotalPages(Math.max(1, typeof data.totalPages === 'number' ? data.totalPages : 1))
        } else {
          const errBody = await response.json().catch(() => ({}))
          setError(errBody.error || 'Failed to fetch templates')
        }
      } catch (fetchError) {
        if (cancelled) return
        console.error('Error fetching templates:', fetchError)
        setError('Error loading templates')
      } finally {
        if (!cancelled) {
          setListLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, page, pageSize, debouncedSearch, listRefreshKey])

  const handleCopyProfileUrl = async (profile: any) => {
    const url = `${siteUrl}/${profile.slug}`
    try {
      const result = await shareResourceUrl({
        url,
        title: profile.title || profile.slug,
        dialogTitle: 'Share template link',
        text: `Open this presentation: ${profile.title || profile.slug}`,
      })
      if (result === 'copied') {
        showAlert(`URL copied to clipboard: ${url}`)
      }
    } catch (err) {
      logger.error('Failed to copy URL:', err)
      showAlert('Failed to copy URL')
    }
  }

  const handleDeleteProfile = async (slug: string, title: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete the template "${title}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const goPage = templates.length === 1 && page > 1 ? page - 1 : page
        if (goPage !== page) {
          setPage(goPage)
        } else {
          void fetchTemplatesPage({ page: goPage })
        }
        showAlert(`Template "${title}" deleted successfully`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete template')
      }
    } catch (err: any) {
      setError('Failed to delete template: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDownloadBackup = async (profile: any) => {
    try {
      const response = await fetch(`/api/profiles/${profile.slug}`)
      if (!response.ok) throw new Error('Failed to fetch profile')

      const fullProfile = await response.json()

      const backupData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        profile: {
          slug: fullProfile.slug,
          title: fullProfile.title,
          description: fullProfile.description,
          isDefault: fullProfile.isDefault,
          isTemplate: fullProfile.isTemplate,
          gospelData: fullProfile.gospelData,
          visitCount: fullProfile.visitCount,
          lastVisited: fullProfile.lastVisited,
          lastViewedScripture: fullProfile.lastViewedScripture,
        },
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${profile.slug}-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error('Error downloading backup:', downloadError)
      showAlert('Failed to download backup')
    }
  }

  const handleRestoreBackup = async (profile: any, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const confirmed = await showConfirm(`Are you sure you want to restore "${profile.title}" from "${file.name}"? This will replace all current content and cannot be undone.`)
    if (!confirmed) {
      event.target.value = ''
      return
    }

    try {
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      const profileData = backupData.profile || {
        ...backupData.profileInfo,
        gospelData: backupData.gospelData,
      }

      if (!profileData.gospelData || !Array.isArray(profileData.gospelData)) {
        throw new Error('Invalid backup file format: gospelData must be an array')
      }

      const updateData = {
        title: profileData.title || profile.title,
        description: profileData.description || '',
        gospelData: profileData.gospelData,
        lastViewedScripture: profileData.lastViewedScripture,
      }

      const response = await fetch(`/api/profiles/${profile.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        showAlert(`Successfully restored content for "${profile.title}" from "${file.name}"!`)
        await fetchTemplatesPage()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save restored content')
      }
    } catch (restoreError: any) {
      console.error('Error restoring backup:', restoreError)
      showAlert(`Failed to restore backup: ${restoreError.message}`)
    } finally {
      event.target.value = ''
    }
  }

  const handleTogglePublic = async (slug: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      })
      if (response.ok) {
        setTemplates((prev) => prev.map((t: any) => (t.slug === slug ? { ...t, isPublic } : t)))
        showAlert(isPublic ? 'Template is now public' : 'Template is no longer public')
      } else {
        const err = await response.json()
        showAlert(err.error || 'Failed to update')
      }
    } catch (e: any) {
      showAlert(e?.message || 'Failed to update')
    }
  }

  const emptyAdminHint = embedded
    ? 'Open a template below to edit content or settings. Use + Add above to create a new blank template, or create from a JSON backup on Admin → Settings.'
    : 'Create template profiles from the main profiles page'

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex w-full min-w-0 flex-row flex-nowrap items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search templates by name, URL, description, or owner..."
              className="w-full min-w-0 px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm text-slate-900 placeholder-slate-400"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2 sm:gap-3">
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedRows.size === templates.length && templates.length > 0) {
                          setExpandedRows(new Set())
                        } else {
                          const allIds = templates.map((t) => t.id)
                          setExpandedRows(new Set(allIds))
                        }
                      }}
                      className="px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-1.5 bg-white text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                      title={expandedRows.size > 0 ? 'Collapse details on this page' : 'Expand details on this page'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {expandedRows.size > 0 ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                      <span className="hidden sm:inline">{expandedRows.size > 0 ? 'Collapse' : 'Expand'}</span>
                    </button>
                  </div>
                )}
                <ViewToggle view={view} onViewChange={setView} />
              </div>
            )}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap sm:gap-2">
              <span className="hidden whitespace-nowrap sm:inline">Per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                aria-label="Templates per page"
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 bg-white"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
        {authReady && total > 0 && (
          <p className="text-xs text-slate-500 mt-2">
            Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      <div className="relative min-h-[120px]">
        {listLoading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/40"
            aria-busy="true"
            aria-label="Loading templates"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          </div>
        )}

        {!listLoading && templates.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-400 text-3xl sm:text-4xl mb-4">🔍</div>
            <p className="text-slate-600 mb-4 text-sm sm:text-base">
              {debouncedSearch ? 'No templates match your search' : 'No templates found'}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">
              {debouncedSearch
                ? 'Try a different search term'
                : userRole === 'admin'
                  ? emptyAdminHint
                  : 'No templates available yet'}
            </p>
          </div>
        ) : view === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                siteUrl={siteUrl}
                onCopyUrl={handleCopyProfileUrl}
                onDelete={handleDeleteProfile}
                onDownloadBackup={handleDownloadBackup}
                onRestoreBackup={handleRestoreBackup}
                onTogglePublic={userRole === 'admin' ? (t, isPublic) => handleTogglePublic(t.slug, isPublic) : undefined}
                userRole={userRole}
                canManage={userRole === 'admin'}
                isExpanded={expandedRows.has(template.id)}
                onToggleExpand={() => {
                  const newSet = new Set(expandedRows)
                  if (newSet.has(template.id)) {
                    newSet.delete(template.id)
                  } else {
                    newSet.add(template.id)
                  }
                  setExpandedRows(newSet)
                }}
                onCloneTemplate={onCloneTemplate}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {templates.map((template) => {
              const isExpanded = expandedRows.has(template.id)
              const toggleExpanded = () => {
                const newSet = new Set(expandedRows)
                if (newSet.has(template.id)) {
                  newSet.delete(template.id)
                } else {
                  newSet.add(template.id)
                }
                setExpandedRows(newSet)
              }

              return (
                <div key={template.id} className="py-4">
                  <div className="relative group">
                    <Link
                      href={`/${template.slug}`}
                      target="_blank"
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 -m-4 rounded-lg transition-colors hover:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {template.title}
                          </h3>

                          {template.description && (
                            <p className="text-xs sm:text-sm text-slate-600">{template.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {userRole === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              toggleExpanded()
                            }}
                            className="relative z-10 text-slate-700 hover:text-slate-800 text-xs sm:text-sm font-medium bg-blue-50 hover:bg-blue-100 px-2 sm:px-3 py-1 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            {isExpanded ? '▼ Details' : '▶ Details'}
                          </button>
                        )}
                      </div>
                    </Link>
                  </div>

                  {isExpanded && userRole === 'admin' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex flex-wrap gap-1.5 pb-2 items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!template.isPublic}
                              onChange={(e) => handleTogglePublic(template.slug, e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-600">Public (Resources)</span>
                          </label>
                        </div>

                        <p className="text-slate-600">
                          <span className="font-medium">URL:</span>{' '}
                          <span className="break-all">
                            {siteUrl}/{template.slug}
                          </span>
                        </p>

                        {template.ownerDisplayName && (
                          <p className="text-slate-600">
                            <span className="font-medium">Owner:</span> {template.ownerDisplayName}
                          </p>
                        )}

                        {template.visitCount !== undefined && (
                          <p className="text-slate-600">
                            <span className="font-medium">Views:</span> {template.visitCount}
                          </p>
                        )}

                        {template.createdAt && (
                          <p className="text-slate-600">
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        )}

                        {template.updatedAt && (
                          <p className="text-slate-600">
                            <span className="font-medium">Updated:</span>{' '}
                            {new Date(template.updatedAt).toLocaleDateString()}
                          </p>
                        )}

                        {template.lastVisited ? (
                          <p className="text-slate-600">
                            <span className="font-medium">Last Viewed:</span>{' '}
                            {new Date(template.lastVisited).toLocaleDateString()}
                          </p>
                        ) : template.visitCount === 0 ? (
                          <p className="text-orange-500">
                            <span className="font-medium">Last Viewed:</span> Never visited
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopyProfileUrl(template)}
                            className="text-slate-700 hover:text-slate-800 text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 px-2 sm:px-3 py-1 rounded-lg border border-slate-300 hover:border-slate-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            Copy URL
                          </button>

                          <Link
                            href={`/admin/profiles/${template.slug}`}
                            className={templateBlueActionClass}
                          >
                            Settings
                          </Link>

                          <Link
                            href={`/admin/profiles/${template.slug}/content`}
                            className={templateBlueActionClass}
                          >
                            Edit
                          </Link>

                          {userRole === 'admin' && onCloneTemplate && (
                            <button
                              type="button"
                              onClick={() =>
                                onCloneTemplate({
                                  slug: template.slug,
                                  title: typeof template.title === 'string' ? template.title : '',
                                })
                              }
                              className={templateBlueActionClass}
                            >
                              Clone
                            </button>
                          )}

                          {userRole === 'admin' && !template.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProfile(template.slug, template.title)}
                              className="text-red-700 hover:text-red-800 text-xs sm:text-sm font-medium bg-red-50 hover:bg-red-100 px-2 sm:px-3 py-1 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {total > 0 && totalPages > 1 && (
        <nav
          className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4"
          aria-label="Template list pagination"
        >
          <p className="text-sm text-slate-600 order-2 sm:order-1">
            Page <span className="font-medium text-slate-900">{page}</span> of{' '}
            <span className="font-medium text-slate-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2 sm:ml-auto">
            <button
              type="button"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || listLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
