'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePresentationScrollReadComplete } from '@/hooks/usePresentationScrollReadComplete'
import { useClientHydrated } from '@/hooks/useClientHydrated'
import { useProfileCanEdit } from '@/hooks/useProfileCanEdit'
import { useProfileContentSearchParams } from '@/hooks/useProfileContentSearchParams'
import { useProfilePersistBeforeLeave } from '@/hooks/useProfilePersistBeforeLeave'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useTranslation } from '@/contexts/TranslationContext'
import { usePrefetchPublicResourcesMenu } from '@/hooks/usePrefetchPublicResourcesMenu'
import { useProfileLastOpenOnEnter } from '@/hooks/useProfileLastOpenOnEnter'
import { useProfileSectionHashScroll } from '@/hooks/useProfileSectionHashScroll'
import { useProfileStudyRefScroll } from '@/hooks/useProfileStudyRefScroll'
import { useProfileVisitTracking } from '@/hooks/useProfileVisitTracking'
import type { GospelSection } from '@/lib/types'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'

export type UseProfileContentBootstrapOptions = {
  sections: GospelSection[]
  profileInfo: ProfileContentProfileInfo
  allowVisitTracking?: boolean
}

export function useProfileContentBootstrap({
  sections,
  profileInfo,
  allowVisitTracking = true,
}: UseProfileContentBootstrapOptions) {
  const { showConfirm, showAlert } = useAlertModal()
  const { translation, enabledTranslations, isLoading: translationsLoading, setTranslation } =
    useTranslation()
  const router = useRouter()
  const searchParams = useProfileContentSearchParams()
  const { registerPersistBeforeLeave, persistReadingResumeBeforeLeave } =
    useProfilePersistBeforeLeave()

  const isHydrated = useClientHydrated()
  const [fromEditor] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('preview') === 'true'
  })

  const sectionCount = sections.length
  const profileSlug = profileInfo.slug
  const profileTitle = profileInfo.title
  const footerAttributionEnabledCodes = translationsLoading ? null : enabledTranslations

  usePrefetchPublicResourcesMenu()
  useProfileSectionHashScroll(isHydrated, sectionCount, profileSlug)
  useProfileVisitTracking(profileSlug, allowVisitTracking)
  useProfileLastOpenOnEnter(profileSlug, profileTitle)
  useProfileStudyRefScroll(
    isHydrated,
    sectionCount,
    profileSlug,
    searchParams.studyRefParam,
    sections
  )
  usePresentationScrollReadComplete(profileSlug)

  const canEdit = useProfileCanEdit(isHydrated)

  return {
    isHydrated,
    fromEditor,
    sectionCount,
    profileSlug,
    profileTitle,
    footerAttributionEnabledCodes,
    canEdit,
    router,
    showConfirm,
    showAlert,
    translation,
    enabledTranslations,
    translationsLoading,
    setTranslation,
    registerPersistBeforeLeave,
    persistReadingResumeBeforeLeave,
    ...searchParams,
  }
}
