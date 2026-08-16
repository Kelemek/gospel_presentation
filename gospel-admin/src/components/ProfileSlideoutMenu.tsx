'use client'

import { type MutableRefObject } from 'react'
import DailyVerseChallengeCard from '@/components/DailyVerseChallengeCard'
import MenuLocalDataBackup from '@/components/MenuLocalDataBackup'
import SidebarAuthNav from '@/components/SidebarAuthNav'
import TableOfContents from '@/components/TableOfContents'
import type { StudyLibraryFocus } from '@/components/SpurgeonSermonsModal'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'
import type { GospelSection } from '@/lib/types'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { VersePinAnchoredEntry } from '@/lib/versePinStorage'

export type ProfileSlideoutMenuProfileInfo = ProfileContentProfileInfo

export type ProfileSlideoutMenuProps = {
  onClose: () => void
  deferCloseMenuForFilePickerRef: MutableRefObject<boolean>
  sections: GospelSection[]
  profileInfo: ProfileSlideoutMenuProfileInfo
  canEdit: boolean
  dailyVerseChallengeVersion: number
  versePinsList: VersePinAnchoredEntry[]
  onClearAllVersePins: () => void
  presentationMarkedReadComplete: boolean
  onMarkPresentationUnread: () => void
  onMemorizationPracticeStart: (verse: MemorizedVerse) => void
  onOpenStudyLibrary: (focus: StudyLibraryFocus, menuTitle?: string) => void
  onOpenMorneveLibrary: () => void
  onOpenMcheynePlan: () => void
  onOpenBibleReader: () => void
}

export default function ProfileSlideoutMenu({
  onClose,
  deferCloseMenuForFilePickerRef,
  sections,
  profileInfo,
  canEdit,
  dailyVerseChallengeVersion,
  versePinsList,
  onClearAllVersePins,
  presentationMarkedReadComplete,
  onMarkPresentationUnread,
  onMemorizationPracticeStart,
  onOpenStudyLibrary,
  onOpenMorneveLibrary,
  onOpenMcheynePlan,
  onOpenBibleReader,
}: ProfileSlideoutMenuProps) {
  return (
    <>
      <div className="lg:hidden fixed inset-0 z-40 print-hide" onClick={onClose} />

      <div
        data-tour="profile-slideout-menu"
        className="fixed top-[env(safe-area-inset-top,0px)] bottom-0 left-0 z-50 bg-white dark:bg-slate-800 w-80 shadow-2xl overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] scrollbar-none border-r border-gray-200 dark:border-slate-600 transform transition-transform duration-300 ease-in-out print-hide"
        onMouseLeave={() => {
          if (typeof document !== 'undefined' && document.body.classList.contains('driver-active')) {
            return
          }
          if (deferCloseMenuForFilePickerRef.current) {
            return
          }
          if (window.innerWidth >= 1024) {
            onClose()
          }
        }}
      >
        <div className="p-6">
          <DailyVerseChallengeCard
            completedVersion={dailyVerseChallengeVersion}
            isAdmin={canEdit}
          />

          <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200 dark:border-slate-600">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Menu</h3>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <TableOfContents
            sections={sections}
            currentProfileSlug={profileInfo.slug}
            onNavigate={onClose}
            onMemorizationPracticeStart={onMemorizationPracticeStart}
            onOpenSpurgeonLibrary={(menuTitle) => onOpenStudyLibrary('spurgeon', menuTitle)}
            onOpenMorneveLibrary={onOpenMorneveLibrary}
            onOpenMcheynePlan={onOpenMcheynePlan}
            onOpenCalvinLibrary={(menuTitle) => onOpenStudyLibrary('calvin', menuTitle)}
            onOpenHenryLibrary={(menuTitle) => onOpenStudyLibrary('henry', menuTitle)}
            onOpenEdwardsLibrary={(menuTitle) => onOpenStudyLibrary('edwards', menuTitle)}
            onOpenBibleReader={onOpenBibleReader}
          />

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              {profileInfo.title || 'Gospel Profile'}
            </div>
            {profileInfo.description ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{profileInfo.description}</div>
            ) : null}
            {profileInfo.favoriteScriptures.length > 0 ? (
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                📖 {profileInfo.favoriteScriptures.length} favorite
                {profileInfo.favoriteScriptures.length !== 1 ? 's' : ''}
              </div>
            ) : null}

            <div
              className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-600"
              data-tour="toc-verse-pins"
            >
              {versePinsList.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Pinned passages ({versePinsList.length})
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                    {versePinsList.map((p) => (
                      <li
                        key={p.bookmarkId ?? `y-${p.reference}-${p.sectionId}-${p.subsectionId}`}
                        className="flex items-center gap-1.5 truncate"
                      >
                        <span className="shrink-0" aria-hidden>
                          📌
                        </span>
                        <span className="truncate" title={`${p.colorId}: ${p.reference}`}>
                          {p.reference}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    data-tour="toc-reset-progress"
                    onClick={onClearAllVersePins}
                    className="w-full cursor-pointer rounded px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                    aria-label="Clear all pinned passages for this presentation"
                  >
                    Clear pinned passages
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Open scripture and choose a pin color beside Memorize — yellow tracks your last
                  passage; other tints can repeat across passages. Saved on this device only.
                </div>
              )}
              {presentationMarkedReadComplete ? (
                <button
                  type="button"
                  onClick={onMarkPresentationUnread}
                  className="mt-3 w-full cursor-pointer rounded px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                  aria-label="Mark this resource as unread"
                >
                  Mark this resource as unread
                </button>
              ) : null}
            </div>
          </div>

          <MenuLocalDataBackup deferCloseMenuForFilePickerRef={deferCloseMenuForFilePickerRef} />
          <SidebarAuthNav />
        </div>
      </div>
    </>
  )
}
