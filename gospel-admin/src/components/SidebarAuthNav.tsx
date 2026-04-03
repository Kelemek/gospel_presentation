'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Capacitor } from '@capacitor/core'

/**
 * Dashboard / Login links for slide-out side menus.
 * Login is hidden on Capacitor native (same as previous TableOfContents behavior).
 */
export default function SidebarAuthNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])

  if (!isLoggedIn && isNative) {
    return null
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600 print-hide">
      {isLoggedIn ? (
        <Link
          href="/admin"
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-white bg-slate-500 hover:bg-slate-600 active:bg-slate-700 border border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Dashboard
        </Link>
      ) : (
        <Link
          href="/login"
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-white bg-slate-500 hover:bg-slate-600 active:bg-slate-700 border border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login
        </Link>
      )}
    </div>
  )
}
