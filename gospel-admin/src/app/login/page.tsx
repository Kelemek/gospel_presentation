'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

function LoginForm() {
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
      // First, check if the user exists in the database
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!checkResponse.ok) {
        throw new Error('Failed to verify user')
      }

      const { exists } = await checkResponse.json()

      if (!exists) {
        logger.warn('Login attempt for non-existent user:', email)
        setError('This email is not authorized to access the system. Please contact your counselor for access.')
        return
      }

      // User exists, proceed with magic link
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
            Sign in to your account
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 border border-slate-200">
          {success ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Check Your Email
                </h2>
                <p className="text-lg text-slate-700 font-medium mb-4">
                  We've sent you a login link!
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <ol className="text-left space-y-3 text-slate-700">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                    <span className="pt-0.5">Open the email we just sent you</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                    <span className="pt-0.5">Click the "Log in" button in the email</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                    <span className="pt-0.5">You'll be automatically signed in</span>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> The link expires in 1 hour. If you don't see the email, check your spam folder.
                </p>
              </div>

              <button
                onClick={() => {
                  setSuccess(null)
                  setError(null)
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Send another link
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
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
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md border border-slate-600"
              >
                {isLoading ? 'Sending...' : 'Send Login Link'}
              </button>

              <p className="text-xs text-center text-slate-600 mt-4">
                We'll email you a magic link for passwordless sign in
              </p>
            </form>
          )}

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
          <p>Need access? Contact your counselor.</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
