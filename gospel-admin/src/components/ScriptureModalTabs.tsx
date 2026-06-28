'use client'

import { useMemo, type RefObject } from 'react'
import OpenItemTabBar from '@/components/OpenItemTabBar'
import ScriptureModalInPageSearch from '@/components/ScriptureModalInPageSearch'
import { lastOpenScriptureDisplayParts } from '@/lib/lastOpenScriptureLabel'
import { SCRIPTURE_SEARCH_INPUT_ARIA_LABEL } from '@/lib/profileResourceInPageSearch'
import { SCRIPTURE_MODAL_TAB_BAR_SCROLL_KEY } from '@/lib/openItemTabBarScrollStorage'
import {
  consumeRevealScriptureTabKey,
  scriptureModalTabKey,
  type ProfileRecentScriptureEntry,
} from '@/lib/profileLastOpenResourceStorage'

export type ScriptureModalTabsProps = {
  tabs: ProfileRecentScriptureEntry[]
  activeSlug: string
  activeReference: string
  onSelectTab: (entry: ProfileRecentScriptureEntry) => void
  onCloseTab: (entry: ProfileRecentScriptureEntry) => void
  searchOpen?: boolean
  onToggleSearch?: () => void
  contentRootRef: RefObject<HTMLElement | null>
}

export default function ScriptureModalTabs({
  tabs,
  activeSlug,
  activeReference,
  onSelectTab,
  onCloseTab,
  searchOpen = false,
  onToggleSearch,
  contentRootRef,
}: ScriptureModalTabsProps) {
  const activeId = scriptureModalTabKey({ slug: activeSlug, reference: activeReference })
  const revealTabId = useMemo(() => {
    void tabs
    return consumeRevealScriptureTabKey()
  }, [tabs])

  const openTabs = tabs.map((entry) => {
    const { book, referenceSuffix } = lastOpenScriptureDisplayParts(entry.reference)
    return {
      id: scriptureModalTabKey(entry),
      title: entry.reference,
      ariaLabel: entry.reference,
      titleParts: { book, suffix: referenceSuffix },
    }
  })

  if (tabs.length === 0) return null

  return (
    <div className="relative w-full min-w-0">
      <OpenItemTabBar
        dataTour="scripture-modal-tabs"
        tablistAriaLabel="Open scripture passages"
        tabs={openTabs}
        activeId={activeId}
        onSelectTab={(id) => {
          const entry = tabs.find((t) => scriptureModalTabKey(t) === id)
          if (entry) onSelectTab(entry)
        }}
        onCloseTab={(id) => {
          const entry = tabs.find((t) => scriptureModalTabKey(t) === id)
          if (entry) onCloseTab(entry)
        }}
        persistScrollKey={SCRIPTURE_MODAL_TAB_BAR_SCROLL_KEY}
        revealTabId={revealTabId}
        hideWhenSingleTab={false}
        expandSingleTab
        searchOpen={searchOpen}
        onToggleSearch={onToggleSearch}
        searchAriaLabel={SCRIPTURE_SEARCH_INPUT_ARIA_LABEL}
        searchDataTour="scripture-modal-search"
      />
      <ScriptureModalInPageSearch
        key={activeId}
        open={searchOpen}
        onOpenChange={(open) => {
          if (!open) onToggleSearch?.()
        }}
        contentRootRef={contentRootRef}
      />
    </div>
  )
}
