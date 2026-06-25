'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  applyKindleReadVersePinHighlightsWithScroll,
  kindleReadProfileSlugFromPathname,
  saveKindleReadLastScriptureCard,
} from '@/lib/kindleReadVersePinProgress'

function KindleReadVersePinClientInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname.startsWith('/read/scripture')) {
      const from = searchParams.get('from')
      const ref = searchParams.get('ref')
      const anchor = searchParams.get('anchor')
      if (from && ref) {
        saveKindleReadLastScriptureCard(from, ref, anchor)
      }
      return
    }

    const slug = kindleReadProfileSlugFromPathname(pathname)
    if (!slug) return

    applyKindleReadVersePinHighlightsWithScroll(slug, { scrollIntoView: true })
  }, [pathname, searchParams])

  return null
}

/** Saves scripture-card reading progress and highlights the resume card on profile read pages. */
export default function KindleReadVersePinClient() {
  return (
    <Suspense fallback={null}>
      <KindleReadVersePinClientInner />
    </Suspense>
  )
}
