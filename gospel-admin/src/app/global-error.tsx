'use client'

import { useEffect } from 'react'
import { attemptCapacitorRecoveryReload, isCapacitorNativeApp } from '@/lib/capacitorAppRecovery'
import { logger } from '@/lib/logger'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('App global error:', error)
    if (isCapacitorNativeApp() && attemptCapacitorRecoveryReload('global-error')) {
      return
    }
    reset()
  }, [error, reset])

  return (
    <html lang="en">
      <body className="antialiased">
        <div
          className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
          data-gospel-surface
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto mb-4" />
            <p className="text-slate-600">
              {isCapacitorNativeApp() ? 'Reconnecting...' : 'Something went wrong'}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
