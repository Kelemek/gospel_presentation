'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  prefetchPublicResourcesMenu,
  shouldLoadPublicResourcesMenu,
} from '@/lib/publicResourcesMenuClient'

export function usePrefetchPublicResourcesMenu() {
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !shouldLoadPublicResourcesMenu(!!user)) return
      prefetchPublicResourcesMenu()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])
}
