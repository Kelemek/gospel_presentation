'use client'

import { type ComponentProps, type RefObject } from 'react'
import GospelSection from '@/components/GospelSection'
import type { GospelSection as GospelSectionType, SavedAnswer } from '@/lib/types'
import type { VersePinAnchoredEntry } from '@/lib/versePinStorage'

type ScriptureClickHandler = NonNullable<ComponentProps<typeof GospelSection>['onScriptureClick']>

export type ProfileMainContentProps = {
  mainContentRef: RefObject<HTMLElement | null>
  sections: GospelSectionType[]
  onScriptureClick: ScriptureClickHandler
  versePinsList: VersePinAnchoredEntry[]
  onRemoveVersePin: (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => void
  profileSlug: string
  savedAnswers?: SavedAnswer[]
  highlightsByScopeId: Record<string, Array<{ id: string; startOffset: number; endOffset: number }>>
  activeHighlightId: string | null
  onHighlightMarkClick: (highlightId: string) => void
  isMenuOpen: boolean
  onCloseMenu: () => void
}

export default function ProfileMainContent({
  mainContentRef,
  sections,
  onScriptureClick,
  versePinsList,
  onRemoveVersePin,
  profileSlug,
  savedAnswers,
  highlightsByScopeId,
  activeHighlightId,
  onHighlightMarkClick,
  isMenuOpen,
  onCloseMenu,
}: ProfileMainContentProps) {
  return (
    <div
      className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900"
      onClick={isMenuOpen ? onCloseMenu : undefined}
    >
      <main ref={mainContentRef} className="container mx-auto min-w-0 max-w-full px-5 py-10">
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.section} className="print-section">
              <GospelSection
                section={section}
                onScriptureClick={onScriptureClick}
                versePins={versePinsList}
                onRemoveVersePin={onRemoveVersePin}
                profileSlug={profileSlug}
                savedAnswers={savedAnswers}
                highlightsByScopeId={highlightsByScopeId}
                activeHighlightId={activeHighlightId}
                onHighlightMarkClick={onHighlightMarkClick}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
