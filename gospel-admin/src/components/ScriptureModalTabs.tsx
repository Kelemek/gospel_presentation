'use client'

import OpenItemTabBar from '@/components/OpenItemTabBar'
import { lastOpenScriptureDisplayParts } from '@/lib/lastOpenScriptureLabel'
import { SCRIPTURE_MODAL_TAB_BAR_SCROLL_KEY } from '@/lib/openItemTabBarScrollStorage'
import type { ProfileRecentScriptureEntry } from '@/lib/profileLastOpenResourceStorage'
import { scriptureModalTabKey } from '@/lib/profileLastOpenResourceStorage'

export type ScriptureModalTabsProps = {
  tabs: ProfileRecentScriptureEntry[]
  activeSlug: string
  activeReference: string
  onSelectTab: (entry: ProfileRecentScriptureEntry) => void
  onCloseTab: (entry: ProfileRecentScriptureEntry) => void
}

export default function ScriptureModalTabs({
  tabs,
  activeSlug,
  activeReference,
  onSelectTab,
  onCloseTab,
}: ScriptureModalTabsProps) {
  const activeId = scriptureModalTabKey({ slug: activeSlug, reference: activeReference })
  const openTabs = tabs.map((entry) => {
    const { book, referenceSuffix } = lastOpenScriptureDisplayParts(entry.reference)
    return {
      id: scriptureModalTabKey(entry),
      title: entry.reference,
      ariaLabel: entry.reference,
      titleParts: { book, suffix: referenceSuffix },
    }
  })

  return (
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
    />
  )
}
