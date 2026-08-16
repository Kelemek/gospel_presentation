'use client'

import { useEffect } from 'react'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'

export function useProfileSectionHashScroll(
  isHydrated: boolean,
  sectionCount: number,
  profileSlug: string | undefined
) {
  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug) return

    const scrollIfHash = () => {
      const raw = window.location.hash.slice(1)
      if (!raw || !raw.startsWith('section-')) return
      scrollToTocAnchor(decodeURIComponent(raw), { behavior: 'auto' })
    }

    const timer = window.setTimeout(scrollIfHash, 0)
    window.addEventListener('hashchange', scrollIfHash)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('hashchange', scrollIfHash)
    }
  }, [isHydrated, sectionCount, profileSlug])
}
