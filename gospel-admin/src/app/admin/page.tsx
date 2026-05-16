'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { TemplatesListPanel } from '@/app/admin/templates/TemplatesListPanel'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import TranslationSettings from '@/components/TranslationSettings'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useSessionMonitor } from '@/hooks/useSessionMonitor'

// Small pure helpers exported for testing. Kept additive and isolated from
// React hooks so they can be unit tested without rendering the client UI.
export function generateSlug(title: string) {
  return (title || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 15) || 'profile'
}

export function createProfilePayload(form: {
  title: string
  description?: string
  cloneFromSlug?: string
  isTemplate?: boolean
}) {
  return {
    title: (form.title || '').trim(),
    description: (form.description || '').trim() || undefined,
    cloneFromSlug: form.cloneFromSlug || 'default',
    isTemplate: !!form.isTemplate,
  }
}

export function isUniqueConstraintError(errOrMessage: unknown) {
  const text = typeof errOrMessage === 'string'
    ? errOrMessage
    : (errOrMessage && typeof errOrMessage === 'object' && errOrMessage !== null
      && ('error' in errOrMessage || 'message' in errOrMessage)
      ? String((errOrMessage as { error?: string; message?: string }).error
        || (errOrMessage as { message?: string }).message)
      : '') || ''

  return (
    typeof text === 'string' && (
      text.includes('duplicate key') ||
      text.includes('unique constraint') ||
      text.includes('profiles_slug_key')
    )
  )
}

function AdminPageContent() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useSessionMonitor({
    checkInterval: 60000,
    enabled: false,
    onSessionExpired: () => {
      logger.warn('Session expired, redirecting to login')
      router.push('/login')
    }
  })

  useEffect(() => {
    void checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()

    let session: { user?: { id: string }; expires_at?: number | null } | null = null
    let sessionError: unknown = null
    let fetchedUser: { id: string } | null = null

    if (typeof (supabase.auth as { getSession?: () => Promise<{ data?: { session?: typeof session }; error?: unknown }> }).getSession === 'function') {
      const res = await supabase.auth.getSession()
      session = res?.data?.session ?? null
      sessionError = res?.error
    } else if (typeof (supabase.auth as { getUser?: () => Promise<{ data?: { user?: { id: string } }; error?: unknown }> }).getUser === 'function') {
      const resUser = await supabase.auth.getUser()
      fetchedUser = resUser?.data?.user ?? null
      if (fetchedUser) {
        session = { user: fetchedUser, expires_at: null }
        sessionError = null
      }
    }

    if (!session || sessionError) {
      router.push('/login')
      return
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    const now = Date.now()

    if (expiresAt && expiresAt < now) {
      if (typeof (supabase.auth as { refreshSession?: () => Promise<{ data?: { session?: typeof session }; error?: unknown }> }).refreshSession === 'function') {
        const refreshRes = await supabase.auth.refreshSession()
        const refreshedSession = refreshRes?.data?.session
        const refreshError = refreshRes?.error
        if (!refreshedSession || refreshError) {
          router.push('/login')
          return
        }
      } else {
        router.push('/login')
        return
      }
    }

    let authUser = fetchedUser
    if (!authUser) {
      const { data: { user: gotUser } = {} } = await supabase.auth.getUser()
      authUser = gotUser ?? null
    }

    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    const role = (userProfile as { role?: string } | null)?.role
    if (role !== 'admin') {
      router.replace('/')
      return
    }

    setUser(authUser)
    setIsLoading(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto py-4 sm:py-6">
        <div className="px-3 sm:px-4 lg:px-6">
          <AdminHeader
            title="Dashboard"
            description="Manage gospel presentation resources, content, and settings"
            actions={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/settings"
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center justify-center"
                >
                  Settings
                </Link>
                <Link
                  href="/"
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center justify-center"
                >
                  <span className="sm:hidden">View</span>
                  <span className="hidden sm:inline">View Site</span>
                </Link>
                <div className="order-3 sm:order-0">
                  <TranslationSettings />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer order-4 sm:order-0 text-sm"
                >
                  Logout
                </button>
              </div>
            }
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-800">{error}</div>
            </div>
          )}
        </div>

        <div className="px-3 sm:px-4 lg:px-6">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold bg-linear-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent">
                  Resource templates
                </h2>
              </div>
            </div>
            <TemplatesListPanel authReady={Boolean(user)} userRole="admin" embedded />
          </div>
        </div>
      </div>
    </div>
  )
}

export { AdminPageContent }

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminPageContent />
    </AdminErrorBoundary>
  )
}
