'use client'

import { useMemo, useSyncExternalStore, type RefObject } from 'react'
import Link from 'next/link'
import BookmarksDropdown from '@/components/BookmarksDropdown'
import HighlightsDropdown from '@/components/HighlightsDropdown'
import ProfileHelpMenu from '@/components/ProfileHelpMenu'
import ProfileResourceReadAloud from '@/components/ProfileResourceReadAloud'
import ProfileResourceTabs from '@/components/ProfileResourceTabs'
import ThemeToggle from '@/components/ThemeToggle'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'
import type { GospelSection } from '@/lib/types'
import type { ProfileRecentResourceEntry } from '@/lib/profileLastOpenResourceStorage'
import {
  profileMenuLabelMinViewportPx,
  showProfileMenuLabelForViewport,
} from '@/lib/profileHeaderMenuLabel'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import { isProfileResourceListenControlAvailable } from '@/lib/profileListenAvailability'
import type { ProfileHighlight } from '@/lib/profileHighlightsStorage'

export type ProfileStickyHeaderProfileInfo = Pick<
  ProfileContentProfileInfo,
  'title' | 'slug' | 'favoriteScriptures'
>

export type ProfileStickyHeaderProps = {
  isMenuOpen: boolean
  onToggleMenu: () => void
  canEdit: boolean
  fromEditor: boolean
  profileInfo: ProfileStickyHeaderProfileInfo
  sections: GospelSection[]
  profileSlug: string
  onFocusHighlight: (highlightId: string) => void
  onOpenScriptureHighlight: (reference: string) => void
  onHighlightsChanged: () => void
  onShareResource: () => void
  isSharingResource: boolean
  resourceTabs: ProfileRecentResourceEntry[]
  onSelectResourceTab: (slug: string) => void
  onCloseResourceTab: (slug: string) => void
  resourceSearchOpen: boolean
  onToggleResourceSearch: () => void
  contentRootRef: RefObject<HTMLElement | null>
  scriptureModalOpen: boolean
}

export default function ProfileStickyHeader({
  isMenuOpen,
  onToggleMenu,
  canEdit,
  fromEditor,
  profileInfo,
  sections,
  profileSlug,
  onFocusHighlight,
  onOpenScriptureHighlight,
  onHighlightsChanged,
  onShareResource,
  isSharingResource,
  resourceTabs,
  onSelectResourceTab,
  onCloseResourceTab,
  resourceSearchOpen,
  onToggleResourceSearch,
  contentRootRef,
  scriptureModalOpen,
}: ProfileStickyHeaderProps) {
  const profileHeaderCompactMenu = useMemo(
    () => isMemorizeAndroidWebHost() && !isProfileResourceListenControlAvailable(),
    []
  )

  const showMenuLabel = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {}
      const minPx = profileMenuLabelMinViewportPx(profileHeaderCompactMenu)
      if (typeof window.matchMedia !== 'function') {
        window.addEventListener('resize', onStoreChange)
        return () => window.removeEventListener('resize', onStoreChange)
      }
      const mq = window.matchMedia(`(min-width: ${minPx}px)`)
      mq.addEventListener('change', onStoreChange)
      return () => mq.removeEventListener('change', onStoreChange)
    },
    () =>
      typeof window !== 'undefined'
        ? typeof window.matchMedia === 'function'
          ? window.matchMedia(`(min-width: ${profileMenuLabelMinViewportPx(profileHeaderCompactMenu)}px)`)
              .matches
          : showProfileMenuLabelForViewport(window.innerWidth, profileHeaderCompactMenu)
        : true,
    () => true
  )

  return (
    <div
      data-profile-sticky-header
      className="sticky top-[env(safe-area-inset-top,0px)] z-40 bg-white shadow-md dark:bg-slate-800 print-hide"
    >
      <div className="w-full min-w-0 px-5 py-3">
        <div className="flex min-w-0 justify-between items-center gap-3">
          <button
            type="button"
            data-tour="profile-menu-button"
            onClick={onToggleMenu}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            title={isMenuOpen ? 'Close menu' : 'Open menu'}
            className={`flex shrink-0 items-center rounded-md transition-colors cursor-pointer bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white ${
              showMenuLabel
                ? 'gap-2 px-2.5 py-2 min-h-[40px] min-w-0'
                : 'justify-center gap-0 p-2 min-h-[36px] min-w-[36px]'
            }`}
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block w-5 h-0.5 bg-slate-800 dark:bg-white" />
              <span className="block w-5 h-0.5 bg-slate-800 dark:bg-white" />
              <span className="block w-5 h-0.5 bg-slate-800 dark:bg-white" />
            </span>
            {showMenuLabel ? (
              <span className="font-medium" aria-hidden>
                Menu
              </span>
            ) : null}
          </button>

          <div
            data-profile-header-toolbar-icons
            className="flex min-w-0 flex-1 justify-end items-center gap-1.5 sm:gap-2.5 overflow-x-auto"
          >
            {canEdit && fromEditor ? (
              <>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {profileInfo.title || 'Gospel Profile'}
                  </div>
                  {profileInfo.favoriteScriptures.length > 0 ? (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      📖 {profileInfo.favoriteScriptures.length} favorite
                      {profileInfo.favoriteScriptures.length !== 1 ? 's' : ''}
                    </div>
                  ) : null}
                </div>

                <Link
                  href={`/admin/profiles/${profileInfo.slug}/content`}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap"
                >
                  ✏️ Edit
                </Link>
              </>
            ) : null}
            <ProfileHelpMenu profileSlug={profileInfo.slug} profileTitle={profileInfo.title} />
            <ProfileResourceReadAloud sections={sections} profileSlug={profileInfo.slug} />
            <HighlightsDropdown
              profileSlug={profileInfo.slug}
              onOpenHighlight={(h: ProfileHighlight) => onFocusHighlight(h.id)}
              onOpenScriptureHighlight={(h) => {
                onOpenScriptureHighlight(h.reference)
              }}
              onHighlightsChanged={onHighlightsChanged}
            />
            <BookmarksDropdown
              sections={sections}
              profileTitle={profileInfo.title}
              profileSlug={profileInfo.slug}
            />
            <button
              type="button"
              data-tour="profile-share-resource"
              onClick={onShareResource}
              disabled={isSharingResource}
              aria-label={isSharingResource ? 'Sharing…' : 'Share this resource'}
              title="Share this resource"
              className="shrink-0 p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
                />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <ProfileResourceTabs
        tabs={resourceTabs}
        activeSlug={profileSlug}
        onSelectTab={onSelectResourceTab}
        onCloseTab={onCloseResourceTab}
        searchOpen={resourceSearchOpen}
        onToggleSearch={onToggleResourceSearch}
        contentRootRef={contentRootRef}
        searchPaused={scriptureModalOpen}
      />
    </div>
  )
}
