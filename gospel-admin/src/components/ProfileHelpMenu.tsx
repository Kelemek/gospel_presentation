'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bookmarksPanelStyleFromTrigger } from '@/components/BookmarksDropdown'
import {
  runAddCustomMemorizationFeatureTour,
  runBibleTranslationFeatureTour,
  runBookmarksFeatureTour,
  runFullProfileHelpTutorial,
  runHighlightsFeatureTour,
  runMarriageSeminarResourcesTour,
  runMemorizeFeatureTour,
  runPrintFeatureTour,
  runProfileListenFeatureTour,
  runResourcesFeatureTour,
  runScriptureModalFeatureTour,
  runWordStudyFeatureTour,
  runScriptureHoverPreviewFeatureTour,
  runShareResourceFeatureTour,
  runTableOfContentsFeatureTour,
  runTextSizeFeatureTour,
  runThemeFeatureTour,
} from '@/lib/profileHelpTours'
import { isProfileResourceListenControlAvailable } from '@/lib/memorizationViewportPlatform'

const TRIGGER_CLASS =
  'p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer'

export type ProfileTutorialId =
  | 'full'
  | 'bookmarks'
  | 'resources'
  | 'tableOfContents'
  | 'textSize'
  | 'print'
  | 'bibleTranslation'
  | 'scriptureModal'
  | 'wordStudy'
  | 'memorize'
  | 'addCustomMemorization'
  | 'scriptureHoverPreview'
  | 'marriageSeminar'
  | 'theme'
  | 'listen'
  | 'highlights'
  | 'share'

type TutorialItem = {
  id: ProfileTutorialId
  label: string
  description: string
  run: () => void
}

export function buildProfileTutorialMenuItems(): TutorialItem[] {
  const headerAfterTheme: TutorialItem[] = [
    {
      id: 'share',
      label: 'Share this resource',
      description: 'Copy a link or use your device share sheet for this presentation',
      run: runShareResourceFeatureTour,
    },
    {
      id: 'bookmarks',
      label: 'Using bookmarks',
      description: 'Save your place and return later',
      run: runBookmarksFeatureTour,
    },
    {
      id: 'highlights',
      label: 'Highlights',
      description: 'Save quotes from the text and reopen them from the highlights list',
      run: runHighlightsFeatureTour,
    },
  ]
  if (isProfileResourceListenControlAvailable()) {
    headerAfterTheme.push({
      id: 'listen',
      label: 'Listen (read aloud)',
      description:
        'Hear this presentation read aloud from the header; section list, play/pause, speed, read-along underline, and Word or Line highlight width',
      run: runProfileListenFeatureTour,
    })
  }

  return [
    {
      id: 'full',
      label: 'Full walkthrough',
      description:
        'All tutorials in order—after Full: theme, then header icons right-to-left (Share, bookmarks, Highlights, Listen when available), then slide-out menu topics, scripture reader, Greek/Hebrew word study, memorization, and more',
      run: runFullProfileHelpTutorial,
    },
    {
      id: 'theme',
      label: 'Light and dark mode',
      description: 'Switch between light and dark appearance',
      run: runThemeFeatureTour,
    },
    ...headerAfterTheme,
    {
      id: 'resources',
      label: 'Resources menu',
      description: 'Categories and shared presentations',
      run: runResourcesFeatureTour,
    },
    {
      id: 'tableOfContents',
      label: 'Table of contents',
      description: 'Jump to sections in this presentation',
      run: runTableOfContentsFeatureTour,
    },
    {
      id: 'textSize',
      label: 'Text size',
      description: 'Make reading larger or smaller on presentation pages',
      run: runTextSizeFeatureTour,
    },
    {
      id: 'print',
      label: 'Print version',
      description: 'Paper or PDF with a print-friendly layout',
      run: runPrintFeatureTour,
    },
    {
      id: 'bibleTranslation',
      label: 'Bible translation',
      description: 'Tap Bible Translation in the menu, then pick a version from the list',
      run: runBibleTranslationFeatureTour,
    },
    {
      id: 'scriptureModal',
      label: 'Scripture reader',
      description: 'Cards, compare, verse/chapter toggle, colored local pins, and Menu clear-all',
      run: runScriptureModalFeatureTour,
    },
    {
      id: 'wordStudy',
      label: 'Greek and Hebrew word study',
      description:
        'STEP Bible tokens in the reader: Greek, Hebrew, or Aramaic button, word chips, Strong’s codes, and lexicon sheet',
      run: runWordStudyFeatureTour,
    },
    {
      id: 'memorize',
      label: 'Verse memorization',
      description: 'Save a verse in the reader, open Memorize in the menu, then remove it',
      run: runMemorizeFeatureTour,
    },
    {
      id: 'addCustomMemorization',
      label: 'Add custom memorization',
      description: 'Pick any book, chapter, and verse from the menu to add to your memorization list',
      run: runAddCustomMemorizationFeatureTour,
    },
    {
      id: 'scriptureHoverPreview',
      label: 'Quick verse preview',
      description: 'Hover on desktop, press-and-hold on mobile; short demo in the popover',
      run: runScriptureHoverPreviewFeatureTour,
    },
    {
      id: 'marriageSeminar',
      label: 'Marriage seminar resources',
      description: 'Open the marriage lesson, video link, scripture, and homework',
      run: runMarriageSeminarResourcesTour,
    },
  ]
}

export default function ProfileHelpMenu() {
  const tutorials = useMemo(() => buildProfileTutorialMenuItems(), [])
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const positionPanel = useCallback(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPanelStyle(bookmarksPanelStyleFromTrigger(rect))
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    positionPanel()
    const raf = requestAnimationFrame(() => positionPanel())
    window.addEventListener('scroll', positionPanel, true)
    window.addEventListener('resize', positionPanel)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', positionPanel, true)
      window.removeEventListener('resize', positionPanel)
    }
  }, [open, positionPanel])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const startTutorial = (item: TutorialItem) => {
    setOpen(false)
    window.requestAnimationFrame(() => {
      item.run()
    })
  }

  return (
    <div className="relative print-hide">
      <button
        id="profile-help-menu-trigger"
        ref={triggerRef}
        type="button"
        data-tour="profile-help-trigger"
        className={TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close help menu' : 'Help and tutorials'}
        title="Help"
        onClick={() => setOpen((v) => !v)}
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
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="bookmarks-dropdown-backdrop fixed inset-0 z-55 print-hide cursor-pointer bg-slate-950/55 dark:bg-slate-950/70"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
              style={panelStyle}
              role="menu"
              aria-label="Tutorials"
            >
              <div className="shrink-0 border-b border-slate-200 dark:border-slate-600 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tutorials</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Step-by-step guides for this site
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                <ul className="space-y-1">
                  {tutorials.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 cursor-pointer"
                        onClick={() => startTutorial(item)}
                      >
                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
