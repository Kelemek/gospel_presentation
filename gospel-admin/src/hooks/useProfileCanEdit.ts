'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** True when the signed-in user has admin role (shows Admin Dashboard in slide-out menu). */
export function useProfileCanEdit(isHydrated: boolean): boolean {
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (!isHydrated) return

    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string }>()

      if (userProfile?.role === 'admin') {
        setCanEdit(true)
      }
    }
    void checkAuth()
  }, [isHydrated])

  return canEdit
}
