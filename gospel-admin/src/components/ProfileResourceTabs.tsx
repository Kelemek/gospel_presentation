'use client'

import { useMemo, type RefObject } from 'react'
import OpenItemTabBar from '@/components/OpenItemTabBar'
import ProfileResourceInPageSearch from '@/components/ProfileResourceInPageSearch'
import { PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY } from '@/lib/openItemTabBarScrollStorage'
import {
  consumeRevealResourceTabSlug,
  type ProfileRecentResourceEntry,
} from '@/lib/profileLastOpenResourceStorage'
import { isProfileResourceTabNavigationPending } from '@/lib/profileResourceTabNavigation'

export type ProfileResourceTabsProps = {
  tabs: ProfileRecentResourceEntry[]
  activeSlug: string
  onSelectTab: (slug: string) => void
  onCloseTab: (slug: string) => void
  searchOpen?: boolean
  onToggleSearch?: () => void
  contentRootRef: RefObject<HTMLElement | null>
  searchPaused?: boolean
}

export default function ProfileResourceTabs({
  tabs,
  activeSlug,
  onSelectTab,
  onCloseTab,
  searchOpen = false,
  onToggleSearch,
  contentRootRef,
  searchPaused = false,
}: ProfileResourceTabsProps) {
  const revealTabId = useMemo(() => {
    void tabs
    return consumeRevealResourceTabSlug()
  }, [tabs])

  if (tabs.length === 0) return null

  return (
    <div className="relative w-full min-w-0">
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
        hideWhenSingleTab={false}
        expandSingleTab
        searchOpen={searchOpen}
        onToggleSearch={onToggleSearch}
        restorePersistedScrollWhen={isProfileResourceTabNavigationPending}
      />
      <ProfileResourceInPageSearch
        key={activeSlug}
        open={searchOpen}
        onOpenChange={(open) => {
          if (!open) onToggleSearch?.()
        }}
        contentRootRef={contentRootRef}
        searchPaused={searchPaused}
        profileSlug={activeSlug}
      />
    </div>
  )
}
