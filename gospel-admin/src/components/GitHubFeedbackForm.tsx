'use client'

import { useState } from 'react'
import ScriptureModalToolbarMenu from '@/components/ScriptureModalToolbarMenu'
import type { FeedbackType } from '@/lib/githubFeedback'

export interface GitHubFeedbackFormValues {
  type: FeedbackType
  title: string
  description: string
}

export interface GitHubFeedbackFormProps {
  onSubmit: (values: GitHubFeedbackFormValues) => Promise<boolean>
  isSubmitting?: boolean
  successMessage?: string
  errorMessage?: string
}

const FEEDBACK_TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
]

function feedbackTypeLabel(type: FeedbackType): string {
  return FEEDBACK_TYPE_OPTIONS.find((opt) => opt.value === type)?.label ?? type
}

export default function GitHubFeedbackForm({
  onSubmit,
  isSubmitting = false,
  successMessage = '',
  errorMessage = '',
}: GitHubFeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !description.trim() || isSubmitting) return
    const submitted = await onSubmit({
      type: feedbackType,
      title: title.trim(),
      description: description.trim(),
    })
    if (submitted) {
      setTitle('')
      setDescription('')
      setFeedbackType('suggestion')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Have a suggestion, bug report, or feature request? Let us know!
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <p
            id="feedback-type-label"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Feedback Type
          </p>
          <ScriptureModalToolbarMenu
            value={feedbackType}
            options={FEEDBACK_TYPE_OPTIONS}
            onSelect={(value) => setFeedbackType(value as FeedbackType)}
            disabled={isSubmitting}
            portaledListbox
            triggerClassName="w-full"
            ariaLabel={`Feedback type, currently ${feedbackTypeLabel(feedbackType)}`}
            listboxAriaLabel="Feedback type options"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-title"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Title
          </label>
          <input
            type="text"
            id="feedback-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your feedback"
            disabled={isSubmitting}
            required
            maxLength={100}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{title.length}/100</p>
        </div>

        <div>
          <label
            htmlFor="feedback-description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Description
          </label>
          <textarea
            id="feedback-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide details about your feedback..."
            disabled={isSubmitting}
            required
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description.length}/1000</p>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="w-full min-h-[48px] cursor-pointer rounded-lg font-medium border border-blue-300 dark:border-blue-600 bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-900/65 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 px-4 py-3 text-sm"
          >
            {isSubmitting ? 'Sending…' : 'Send Feedback'}
          </button>
        </div>
      </form>

      {successMessage ? (
        <div
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="flex items-start gap-2">
            <svg
              className="text-green-600 dark:text-green-400 shrink-0 mt-0.5"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                Thank you for your feedback!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Your submission has been received and will be reviewed by our team.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="flex items-start gap-2">
            <svg
              className="text-red-600 dark:text-red-400 shrink-0 mt-0.5"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error sending feedback</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
