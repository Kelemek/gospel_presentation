'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check for errors from URL parameters (from auth callback)
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        logger.warn('Magic link request failed:', signInError.message)
        setError(signInError.message)
        return
      }

      logger.info('Magic link sent to:', email)
      setSuccess('Check your email! We sent you a login link.')
      setEmail('') // Clear the email field
    } catch (err: any) {
      logger.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Gospel Presentation
          </h1>
          <p className="text-slate-600">
            Admin Login
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 border border-slate-200">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium">{success}</p>
                <p className="text-xs mt-1">Click the link in your email to log in. You can close this page.</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 transition-all"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isLoading ? 'Sending...' : 'Send Login Link'}
            </button>

            <p className="text-xs text-center text-slate-600 mt-4">
              We'll email you a magic link for passwordless sign in
            </p>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Gospel Presentation
            </a>
          </div>
        </div>

        <div className="text-center text-sm text-slate-600">
          <p>Need access? Contact your administrator.</p>
        </div>
      </div>
    </div>
  )
}
