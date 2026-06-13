'use client'

import { useEffect } from 'react'
import { attemptCapacitorRecoveryReload, isCapacitorNativeApp } from '@/lib/capacitorAppRecovery'
import { logger } from '@/lib/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('App route error:', error)
    if (isCapacitorNativeApp() && attemptCapacitorRecoveryReload('route-error')) {
      return
    }
    reset()
  }, [error, reset])

  if (isCapacitorNativeApp()) {
    return (
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
        data-gospel-surface
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Reconnecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-linear-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4"
      data-gospel-surface
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-red-100 dark:border-slate-600 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
            <span className="text-2xl" aria-hidden>
              ⚠️
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              We encountered an unexpected error
            </p>
          </div>
        </div>

        {error.message ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
              {error.message}
            </p>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Go Home
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-400 mt-4 text-center">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  )
}
