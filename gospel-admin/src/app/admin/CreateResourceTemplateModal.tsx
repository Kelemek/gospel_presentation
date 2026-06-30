'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProfilePayload, generateSlug, isProfileSlugTakenError } from '@/app/admin/profileCreateHelpers'
import { validateProfileSlug } from '@/lib/profile-service'
import { PROFILE_VALIDATION } from '@/lib/types'

/** `null` = modal closed. */
export type ResourceTemplateModalMode =
  | { kind: 'blank' }
  | { kind: 'clone'; sourceSlug: string; sourceTitle: string }

export interface CreateResourceTemplateModalProps {
  mode: ResourceTemplateModalMode | null
  onClose: () => void
  /** Called after a successful create (e.g. bump template list refresh key) before navigation. */
  onCreated?: () => void
}

function copyTemplateTitle(sourceTitle: string, sourceSlug: string): string {
  const base = (sourceTitle || sourceSlug).trim() || sourceSlug
  const full = `Copy of ${base}`
  return full.slice(0, PROFILE_VALIDATION.TITLE_MAX_LENGTH)
}

function modeSessionKey(mode: ResourceTemplateModalMode): string {
  if (mode.kind === 'blank') return 'blank'
  return `clone:${mode.sourceSlug}:${mode.sourceTitle}`
}

function initialFormStateForMode(mode: ResourceTemplateModalMode): {
  slug: string
  title: string
  description: string
} {
  if (mode.kind === 'blank') {
    return { slug: '', title: '', description: '' }
  }
  const nextTitle = copyTemplateTitle(mode.sourceTitle, mode.sourceSlug)
  const suggested = generateSlug(nextTitle)
  return {
    slug: suggested.length >= PROFILE_VALIDATION.SLUG_MIN_LENGTH ? suggested : '',
    title: nextTitle,
    description: '',
  }
}

function CreateResourceTemplateModalForm({
  mode,
  onClose,
  onCreated,
}: {
  mode: ResourceTemplateModalMode
  onClose: () => void
  onCreated?: () => void
}) {
  const router = useRouter()
  const siteHost = typeof window !== 'undefined' ? window.location.host : 'yoursite.com'
  const initialForm = initialFormStateForMode(mode)
  const [slug, setSlug] = useState(initialForm.slug)
  const [title, setTitle] = useState(initialForm.title)
  const [description, setDescription] = useState(initialForm.description)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSuggestSlugFromTitle = () => {
    const s = generateSlug(title)
    if (s.length >= PROFILE_VALIDATION.SLUG_MIN_LENGTH) {
      setSlug(s)
    } else {
      setFormError(
        `Title must yield at least ${PROFILE_VALIDATION.SLUG_MIN_LENGTH} letters/numbers for a URL slug, or type a slug manually.`
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const slugTrim = slug.trim().toLowerCase()
    const slugResult = validateProfileSlug(slugTrim)
    if (!slugResult.isValid) {
      setFormError(slugResult.error || 'Invalid URL slug')
      return
    }

    const t = title.trim()
    if (!t) {
      setFormError('Title is required')
      return
    }

    setIsSubmitting(true)
    try {
      const body =
        mode.kind === 'blank'
          ? createProfilePayload({
              slug: slugTrim,
              title: t,
              description: description.trim() || undefined,
              isTemplate: true,
              blankGospelData: true,
            })
          : createProfilePayload({
              slug: slugTrim,
              title: t,
              description: description.trim() || undefined,
              isTemplate: true,
              cloneFromSlug: mode.sourceSlug,
            })

      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Failed to create profile'
        if (isProfileSlugTakenError(msg) || isProfileSlugTakenError(data)) {
          setFormError('That URL is already in use. Choose a different slug.')
        } else {
          setFormError(msg)
        }
        return
      }

      const newSlug = data.profile?.slug as string | undefined
      if (!newSlug) {
        setFormError('Created profile but response was missing slug')
        return
      }

      onCreated?.()
      onClose()
      router.push(`/admin/profiles/${newSlug}/content`)
    } catch {
      setFormError('Failed to create profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const heading = mode.kind === 'clone' ? 'Clone resource template' : 'New resource template'
  const footerHint =
    mode.kind === 'clone'
      ? `Content is copied from "${mode.sourceTitle || mode.sourceSlug}". You can edit sections in the content editor.`
      : 'Presentation starts empty; add sections in the content editor.'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-resource-template-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-start justify-between gap-3">
          <h2 id="create-resource-template-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none p-1 -m-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="new-template-slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              URL
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm shrink-0 max-w-[45%] truncate">
                {siteHost}/
              </span>
              <input
                id="new-template-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="mytemplate"
                autoComplete="off"
                className="flex-1 min-w-0 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-r-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {PROFILE_VALIDATION.SLUG_MIN_LENGTH}–{PROFILE_VALIDATION.SLUG_MAX_LENGTH} chars, lowercase letters and numbers, start with a letter. Cannot be changed later.
              </p>
              <button
                type="button"
                onClick={handleSuggestSlugFromTitle}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Suggest from title
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-template-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              id="new-template-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Youth group gospel"
              maxLength={PROFILE_VALIDATION.TITLE_MAX_LENGTH}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="new-template-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="new-template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              maxLength={PROFILE_VALIDATION.DESCRIPTION_MAX_LENGTH}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">{footerHint}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-200 dark:hover:text-blue-100 dark:border-blue-800 dark:hover:border-blue-700"
            >
              {isSubmitting ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-medium border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateResourceTemplateModal({ mode, onClose, onCreated }: CreateResourceTemplateModalProps) {
  if (mode === null) return null

  return (
    <CreateResourceTemplateModalForm
      key={modeSessionKey(mode)}
      mode={mode}
      onClose={onClose}
      onCreated={onCreated}
    />
  )
}
