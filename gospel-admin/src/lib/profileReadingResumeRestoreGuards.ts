import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'
import {
  resolveMcheynePlanDayFromNavigation,
  resolveMcheyneResumePinFromNavigation,
} from '@/lib/mcheyne/mcheynePendingNavigation'
import type { GospelSection } from '@/lib/types'
import {
  captureReadingPositionAtViewport,
  isReadingPositionAheadOf,
} from '@/lib/profileReadingPosition'
import { getOrderedTocAnchorIds } from '@/lib/tocAnchorFromScroll'
import type { ProfileReadingResumeV1 } from '@/lib/profileReadingResumeStorage'

export type ReadingResumeNavigationContext = {
  profileSlug: string
  sectionCount: number
  selectedScriptureIsOpen: boolean
  studyRefParam: string
  mcheynePlanDayParam: string
  mcheyneResumePinParam: string
  locationHash: string
}

export function shouldSkipStoredReadingResumeRestore({
  profileSlug,
  sectionCount,
  selectedScriptureIsOpen,
  studyRefParam,
  mcheynePlanDayParam,
  mcheyneResumePinParam,
  locationHash,
}: ReadingResumeNavigationContext): boolean {
  if (!profileSlug || sectionCount === 0) return true
  if (selectedScriptureIsOpen) return true
  if (studyRefParam) return true
  if (locationHash && locationHash.startsWith('section-')) return true

  if (isMcheyneProfileSlug(profileSlug)) {
    if (resolveMcheynePlanDayFromNavigation(mcheynePlanDayParam) != null) return true
    if (resolveMcheyneResumePinFromNavigation(mcheyneResumePinParam)) return true
  }

  return false
}

export function shouldDeferToStudyOrHashNavigation({
  studyRefParam,
  mcheynePlanDayParam,
  mcheyneResumePinParam,
  profileSlug,
  locationHash,
}: Pick<
  ReadingResumeNavigationContext,
  'studyRefParam' | 'mcheynePlanDayParam' | 'mcheyneResumePinParam' | 'profileSlug' | 'locationHash'
>): boolean {
  if (studyRefParam) return true
  if (locationHash && locationHash.startsWith('section-')) return true

  if (isMcheyneProfileSlug(profileSlug)) {
    if (resolveMcheynePlanDayFromNavigation(mcheynePlanDayParam) != null) return true
    if (resolveMcheyneResumePinFromNavigation(mcheyneResumePinParam)) return true
  }

  return false
}

export function shouldRestoreStoredReadingResumeAtScrollY(
  saved: ProfileReadingResumeV1,
  sections: GospelSection[],
  profileSlug: string,
  scrollY: number,
  options: { allowWhenAheadOfViewport?: boolean } = {}
): boolean {
  if (scrollY <= 8) return true
  if (!options.allowWhenAheadOfViewport) return false

  try {
    const current = captureReadingPositionAtViewport(sections, profileSlug)
    if (!current) return false
    const orderedIds = getOrderedTocAnchorIds(sections)
    return isReadingPositionAheadOf(saved, current, orderedIds)
  } catch {
    return false
  }
}
