'use client'

import ProfileContentFooter from '@/components/ProfileContentFooter'
import ProfileContentLayout from '@/components/ProfileContentLayout'
import ProfileContentModals from '@/components/ProfileContentModals'
import PresentationFirstVisitWelcome from '@/components/PresentationFirstVisitWelcome'
import { useProfileContentHooks } from '@/hooks/useProfileContentHooks'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'
import { GospelSection as GospelSectionType } from '@/lib/types'

interface ProfileContentProps {
  sections: GospelSectionType[] | undefined
  profileInfo: ProfileContentProfileInfo | undefined
  onReadingResumeSettled?: () => void
  allowVisitTracking?: boolean
}

type ProfileContentReadyProps = {
  sections: GospelSectionType[]
  profileInfo: ProfileContentProfileInfo
  onReadingResumeSettled?: () => void
  allowVisitTracking?: boolean
}

function ProfileContentReady({
  sections,
  profileInfo,
  onReadingResumeSettled,
  allowVisitTracking = true,
}: ProfileContentReadyProps) {
  const { layout, modals, footerAttributionEnabledCodes } = useProfileContentHooks({
    sections,
    profileInfo,
    onReadingResumeSettled,
    allowVisitTracking,
  })

  return (
    <>
      <PresentationFirstVisitWelcome />
      <div className="print-header" style={{ display: 'none' }}>
        <h1 className="print-title">The Gospel Presentation</h1>
      </div>

      <ProfileContentLayout {...layout} />
      <ProfileContentFooter enabledTranslationCodes={footerAttributionEnabledCodes} />
      <ProfileContentModals {...modals} />
    </>
  )
}

function ProfileContent({
  sections,
  profileInfo,
  onReadingResumeSettled,
  allowVisitTracking = true,
}: ProfileContentProps) {
  if (!sections || !profileInfo) {
    return null
  }

  return (
    <ProfileContentReady
      sections={sections}
      profileInfo={profileInfo}
      onReadingResumeSettled={onReadingResumeSettled}
      allowVisitTracking={allowVisitTracking}
    />
  )
}

export { ProfileContent }
export default ProfileContent
