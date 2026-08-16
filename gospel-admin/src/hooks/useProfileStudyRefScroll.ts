'use client'

import { useEffect } from 'react'
import { scrollToTocAnchorWhenReady } from '@/lib/scrollToTocAnchor'
import { findFirstStudyPassageAnchor } from '@/lib/findFirstStudyPassageAnchor'
import type { GospelSection } from '@/lib/types'

export function useProfileStudyRefScroll(
  isHydrated: boolean,
  sectionCount: number,
  profileSlug: string | undefined,
  studyRefParam: string,
  sections: GospelSection[] | undefined
) {
  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug || !studyRefParam || !sections) return
    const anchor = findFirstStudyPassageAnchor(sections, studyRefParam)
    if (!anchor) return
    return scrollToTocAnchorWhenReady(anchor.subsectionId, { behavior: 'auto' })
  }, [isHydrated, sectionCount, profileSlug, studyRefParam, sections])
}
