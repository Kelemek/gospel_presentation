'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import { createClient } from '@/lib/supabase/client'
import { TemplatesListPanel } from '@/app/admin/templates/TemplatesListPanel'

function TemplatesPageContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    void checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (userProfile as { role?: string } | null)?.role
    if (profileError || role !== 'admin') {
      router.replace('/')
      return
    }

    setIsLoading(false)
    setAuthReady(true)
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
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto py-6 sm:py-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Resource Template</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Manage resource templates that can be used to create new resources
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  ← Back
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
            <TemplatesListPanel authReady={authReady} userRole="admin" embedded={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <AdminErrorBoundary>
      <TemplatesPageContent />
    </AdminErrorBoundary>
  )
}

export { TemplatesPageContent }
