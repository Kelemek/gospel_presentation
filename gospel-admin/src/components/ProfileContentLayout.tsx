'use client'

import ProfileMainContent from '@/components/ProfileMainContent'
import ProfileSlideoutMenu from '@/components/ProfileSlideoutMenu'
import ProfileStickyHeader from '@/components/ProfileStickyHeader'
import type { ProfileSlideoutMenuProps } from '@/components/ProfileSlideoutMenu'
import type { ProfileStickyHeaderProps } from '@/components/ProfileStickyHeader'
import type { ProfileMainContentProps } from '@/components/ProfileMainContent'

export type ProfileContentLayoutProps = {
  header: ProfileStickyHeaderProps
  main: ProfileMainContentProps
  slideout: ProfileSlideoutMenuProps | null
  onOpenMenuHover: () => void
}

export default function ProfileContentLayout({
  header,
  main,
  slideout,
  onOpenMenuHover,
}: ProfileContentLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <ProfileStickyHeader {...header} />

      <div
        className="hidden lg:block fixed left-0 top-0 h-full w-12 z-30 print-hide"
        onMouseEnter={onOpenMenuHover}
      />

      <ProfileMainContent {...main} />

      {slideout ? <ProfileSlideoutMenu {...slideout} /> : null}
    </div>
  )
}
