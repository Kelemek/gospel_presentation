'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import GitHubFeedbackForm, { type GitHubFeedbackFormValues } from '@/components/GitHubFeedbackForm'

export interface GitHubFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  profileSlug?: string
  profileTitle?: string
}

export default function GitHubFeedbackModal({
  isOpen,
  onClose,
  profileSlug,
  profileTitle,
}: GitHubFeedbackModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const successTimerRef = useRef<number | null>(null)

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearSuccessTimer()
  }, [clearSuccessTimer])

  const handleClose = useCallback(() => {
    clearSuccessTimer()
    setSuccessMessage('')
    setErrorMessage('')
    setIsSubmitting(false)
    onClose()
  }, [clearSuccessTimer, onClose])

  const handleSubmit = useCallback(
    async (values: GitHubFeedbackFormValues): Promise<boolean> => {
      setIsSubmitting(true)
      setSuccessMessage('')
      setErrorMessage('')
      clearSuccessTimer()

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            pageUrl: typeof window !== 'undefined' ? window.location.href : null,
            profileSlug: profileSlug ?? null,
            profileTitle: profileTitle ?? null,
          }),
        })
        const data = (await res.json()) as { error?: string; success?: boolean }

        if (!res.ok) {
          setErrorMessage(data.error || 'Failed to submit feedback. Please try again.')
          return false
        }

        setSuccessMessage('Thank you! Your feedback has been submitted.')
        successTimerRef.current = window.setTimeout(() => {
          setSuccessMessage('')
          successTimerRef.current = null
        }, 5000)
        return true
      } catch {
        setErrorMessage('An unexpected error occurred. Please try again.')
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [clearSuccessTimer, profileSlug, profileTitle]
  )

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
        aria-labelledby="github-feedback-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600 px-6 py-4 flex items-center justify-between">
          <h2
            id="github-feedback-modal-title"
            className="text-xl font-bold text-slate-800 dark:text-slate-100"
          >
            Send Feedback
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close feedback modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <GitHubFeedbackForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            successMessage={successMessage}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
