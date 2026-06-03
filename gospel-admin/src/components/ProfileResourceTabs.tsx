'use client'

import { useMemo } from 'react'
import OpenItemTabBar from '@/components/OpenItemTabBar'
import { PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY } from '@/lib/openItemTabBarScrollStorage'
import {
  consumeRevealResourceTabSlug,
  type ProfileRecentResourceEntry,
} from '@/lib/profileLastOpenResourceStorage'

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
  const revealTabId = useMemo(() => {
    void tabs
    return consumeRevealResourceTabSlug()
  }, [tabs])

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
      persistScrollKey={PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY}
      revealTabId={revealTabId}
    />
  )
}
