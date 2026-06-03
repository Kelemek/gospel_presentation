'use client'

import OpenItemTabBar from '@/components/OpenItemTabBar'
import type { ProfileRecentResourceEntry } from '@/lib/profileLastOpenResourceStorage'

export type ProfileResourceTabsProps = {
  tabs: ProfileRecentResourceEntry[]
  activeSlug: string
  onSelectTab: (slug: string) => void
  onCloseTab: (slug: string) => void
}

export default function ProfileResourceTabs({
  tabs,
  activeSlug,
  onSelectTab,
  onCloseTab,
}: ProfileResourceTabsProps) {
  return (
    <OpenItemTabBar
      dataTour="profile-resource-tabs"
      tablistAriaLabel="Open resources"
      tabs={tabs.map((entry) => ({
        id: entry.slug,
        title: entry.title,
        ariaLabel: entry.title,
      }))}
      activeId={activeSlug.trim()}
      onSelectTab={onSelectTab}
      onCloseTab={onCloseTab}
    />
  )
}
