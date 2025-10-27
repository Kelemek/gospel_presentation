'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

interface AdminErrorBoundaryProps {
  children: ReactNode
}

/**
 * Specialized Error Boundary for admin pages
 * Shows admin-specific fallback UI
 */
export default function AdminErrorBoundary({ children }: AdminErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-red-100 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🛠️</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Error</h1>
              <p className="text-gray-600">
                The admin interface encountered an unexpected error
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Troubleshooting tips:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Try refreshing the page</li>
                <li>Check your network connection</li>
                <li>Clear your browser cache and cookies</li>
                <li>Ensure environment variables are set correctly</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reload Page
              </button>
              <a
                href="/admin"
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-center"
              >
                Admin Home
              </a>
              <a
                href="/"
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-center"
              >
                Public Site
              </a>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
