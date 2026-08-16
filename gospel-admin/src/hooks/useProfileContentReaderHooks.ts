'use client'

import { useLayoutEffect, useMemo } from 'react'
import type { useRouter } from 'next/navigation'
import { useProfileMcheyneNavigation } from '@/hooks/useProfileMcheyneNavigation'
import { useProfileReadingResume } from '@/hooks/useProfileReadingResume'
import { useProfileScriptureModal } from '@/hooks/useProfileScriptureModal'
import { useProfileStudyModals } from '@/hooks/useProfileStudyModals'
import { buildProfileScriptureRefNavList } from '@/lib/buildProfileScriptureRefNavList'
import type { BibleTranslation } from '@/contexts/TranslationContext'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'
import type { GospelSection } from '@/lib/types'
import type { useProfileVersePins } from '@/hooks/useProfileVersePins'

export type UseProfileContentReaderHooksOptions = {
  isHydrated: boolean
  sectionCount: number
  profileSlug: string
  profileTitle: string
  sections: GospelSection[]
  profileInfo: ProfileContentProfileInfo
  scriptureRefParam: string
  scriptureViewParam: string
  translationParam: string
  studyRefParam: string
  mcheynePlanDayParam: string
  mcheyneResumePinParam: string
  translation: BibleTranslation
  enabledTranslations: BibleTranslation[]
  translationsLoading: boolean
  setTranslation: (translation: BibleTranslation) => void
  router: ReturnType<typeof useRouter>
  versePinMap: ReturnType<typeof useProfileVersePins>['versePinMap']
  bumpVersePins: ReturnType<typeof useProfileVersePins>['bumpVersePins']
  persistReadingResumeBeforeLeave: (reason?: string) => void
  registerPersistBeforeLeave: (handler: (reason?: string) => void) => void
  completeDailyVerseChallengeIfMatch: (reference: string) => void
  closeMenu: () => void
  clearResourceSearch: () => void
  onReadingResumeSettled?: () => void
}

export function useProfileContentReaderHooks({
  isHydrated,
  sectionCount,
  profileSlug,
  profileTitle,
  sections,
  profileInfo,
  scriptureRefParam,
  scriptureViewParam,
  translationParam,
  studyRefParam,
  mcheynePlanDayParam,
  mcheyneResumePinParam,
  translation,
  enabledTranslations,
  translationsLoading,
  setTranslation,
  router,
  versePinMap,
  bumpVersePins,
  persistReadingResumeBeforeLeave,
  registerPersistBeforeLeave,
  completeDailyVerseChallengeIfMatch,
  closeMenu,
  clearResourceSearch,
  onReadingResumeSettled,
}: UseProfileContentReaderHooksOptions) {
  const allScriptureRefs = useMemo(
    () => buildProfileScriptureRefNavList(sections),
    [sections]
  )

  const scriptureModal = useProfileScriptureModal({
    isHydrated,
    sectionCount,
    profileSlug,
    profileTitle,
    sections,
    allScriptureRefs,
    scriptureRefParam,
    scriptureViewParam,
    translationParam,
    translation,
    enabledTranslations,
    translationsLoading,
    setTranslation,
    versePinMap,
    bumpVersePins,
    persistReadingResumeBeforeLeave,
    completeDailyVerseChallengeIfMatch,
    router,
  })

  const {
    handleSelectResourceTab,
    handleCloseResourceTab,
    persistReadingResumeBeforeLeave: persistOnLeave,
  } = useProfileReadingResume({
    isHydrated,
    profileSlug,
    sectionCount,
    sections,
    selectedScriptureIsOpen: scriptureModal.selectedScriptureIsOpen,
    studyRefParam,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    onReadingResumeSettled,
    router,
    clearResourceSearch,
  })

  useLayoutEffect(() => {
    registerPersistBeforeLeave(persistOnLeave)
  }, [registerPersistBeforeLeave, persistOnLeave])

  const studyModals = useProfileStudyModals({
    profileSlug,
    closeMenu,
    closeModal: scriptureModal.closeModal,
    openScriptureFromTabEntry: scriptureModal.openScriptureFromTabEntry,
    navigateScriptureInReader: scriptureModal.navigateScriptureInReader,
  })

  const { navigateMcheynePlanDay, navigateMcheyneLatest } = useProfileMcheyneNavigation({
    isHydrated,
    sectionCount,
    profileSlug,
    sections,
    studyRefParam,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    bumpVersePins,
  })

  return {
    profileInfo,
    sections,
    scriptureModal,
    studyModals,
    handleSelectResourceTab,
    handleCloseResourceTab,
    navigateMcheynePlanDay,
    navigateMcheyneLatest,
  }
}
