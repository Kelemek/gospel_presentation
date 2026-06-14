'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'
import { siteChangelogEntryKey, type SiteChangelogMonthGroup } from '@/lib/siteChangelogShared'

export interface SiteChangelogModalProps {
  isOpen: boolean
  onClose: () => void
}

function SiteChangelogModalBody() {
  const [groups, setGroups] = useState<SiteChangelogMonthGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadChangelog() {
      try {
        const res = await fetch('/api/site-changelog', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) {
            setError('Could not load the change log. Please try again.')
            setGroups([])
          }
          return
        }
        const data = (await res.json()) as { groups?: SiteChangelogMonthGroup[] }
        if (!cancelled) {
          setGroups(Array.isArray(data.groups) ? data.groups : [])
        }
      } catch {
        if (!cancelled) {
          setError('Could not load the change log. Please try again.')
          setGroups([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadChangelog()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Loading…</p>
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    )
  }

  if (groups.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">No changes to show yet.</p>
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {group.label}
          </h3>
          <ul className="space-y-2 list-disc pl-5 text-sm text-slate-700 dark:text-slate-200">
            {group.entries.map((entry) => (
              <li key={`${group.label}-${siteChangelogEntryKey(entry)}`}>
                {entry.message}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function SiteChangelogModal({ isOpen, onClose }: SiteChangelogModalProps) {
  usePostHogModalOpen('site_changelog', isOpen)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[min(90vh,90dvh)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-changelog-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600 px-6 py-4 flex items-center justify-between">
          <h2
            id="site-changelog-modal-title"
            className="text-xl font-bold text-slate-800 dark:text-slate-100"
          >
            Change log
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close change log"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <SiteChangelogModalBody key="site-changelog-body" />
        </div>
      </div>
    </div>,
    document.body
  )
}
