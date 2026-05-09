'use client'

import { useEffect } from 'react'
import { addPresentationReadCompleteSlug } from '@/lib/presentationReadCompleteStorage'

const BOTTOM_THRESHOLD_PX = 100

/** One-shot per mount: when the window scroll reaches the document bottom, mark the profile slug read-complete. */
export function usePresentationScrollReadComplete(profileSlug: string | undefined): void {
  useEffect(() => {
    const slug = profileSlug?.trim()
    if (!slug) return

    let done = false
    const check = () => {
      if (done || typeof document === 'undefined') return
      const el = document.documentElement
      const scrollBottom = window.scrollY + window.innerHeight
      if (scrollBottom >= el.scrollHeight - BOTTOM_THRESHOLD_PX) {
        done = true
        addPresentationReadCompleteSlug(slug)
        window.removeEventListener('scroll', check)
        window.removeEventListener('resize', check)
      }
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [profileSlug])
}
