import { loadBookmarks } from '@/lib/profileBookmarksStorage'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  ALERT_MODAL_CONFIRM,
  BOOKMARKS_ADD,
  BOOKMARKS_PANEL,
  BOOKMARKS_REMOVE,
  BOOKMARKS_ROW,
  BOOKMARKS_TRIGGER,
  baseProfileHelpDriverConfig,
  closeBookmarksPanelIfOpen,
  createProfileHelpDriver,
  escapeAttrSelectorValue,
  openBookmarksPanelIfClosed,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
  queryBookmarkTourScrollTarget,
  scrollBookmarkTourSampleIntoView,
  waitUntil,
} from './tourShared'

export function runBookmarksFeatureTour(options?: ProfileFeatureTourOptions): void {
  let tourAddedBookmarkId: string | null = null

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        closeBookmarksPanelIfOpen()
        window.requestAnimationFrame(() => {
          closeBookmarksPanelIfOpen()
        })
        options?.onAborted?.()
      },
      onComplete: () => {
        closeBookmarksPanelIfOpen()
        window.requestAnimationFrame(() => {
          closeBookmarksPanelIfOpen()
          options?.onComplete?.()
        })
      },
    }),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: BOOKMARKS_TRIGGER,
        popover: {
          title: 'Bookmarks',
          description:
            'Use this icon to save where you are in this presentation or jump back later. Bookmarks are stored only on this device (your browser). Use <strong>Next</strong> to see how <strong>where you scroll</strong> affects what gets saved.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 160)
          },
        },
      },
      {
        element: () =>
          queryBookmarkTourScrollTarget() ??
          document.querySelector('main.container') ??
          document.body,
        popover: {
          title: 'Reading position',
          description:
            '<strong>Where you scroll</strong> on the page matters: bookmarks save your place inside the current section—not only the section heading—so you can jump back to the same paragraph on long resources. Use <strong>Next</strong> to continue.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            scrollBookmarkTourSampleIntoView()
            const delay = prefersReducedMotion() ? 160 : 720
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, delay)
          },
        },
      },
      {
        element: BOOKMARKS_TRIGGER,
        popover: {
          title: 'Open your bookmarks',
          description:
            'Tap the <strong>bookmark</strong> icon to open the list of saved places. Use <strong>Next</strong> to open the panel for this tour.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            openBookmarksPanelIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 220)
          },
        },
      },
      {
        element: BOOKMARKS_ADD,
        popover: {
          title: 'Add bookmark',
          description:
            'This panel lists your saved places. Use <strong>Add bookmark</strong> to capture this profile and your current reading line—or use <strong>Next</strong> and this tour will add one for you. Open a row to jump there, or another profile. The next steps show your bookmark in the list and how to remove it. If this spot was already saved, you will still see the row and removal steps.',
          side: 'left',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            const before = new Set(loadBookmarks().map((b) => b.id))
            document.querySelector<HTMLElement>(BOOKMARKS_ADD)?.click()
            void waitUntil(() => {
              const added = loadBookmarks().find((b) => !before.has(b.id))
              if (added) {
                tourAddedBookmarkId = added.id
                return true
              }
              return false
            }, 5000).then((ok) => {
              if (!ok) tourAddedBookmarkId = null
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, prefersReducedMotion() ? 80 : 200)
            })
          },
        },
      },
      {
        element: () => {
          if (tourAddedBookmarkId) {
            const row = document.querySelector(
              `${BOOKMARKS_ROW}[data-bookmark-id="${escapeAttrSelectorValue(tourAddedBookmarkId)}"]`
            )
            if (row) return row
          }
          return (
            document.querySelector(BOOKMARKS_ROW) ??
            document.querySelector(BOOKMARKS_PANEL) ??
            document.body
          )
        },
        popover: {
          title: 'Your bookmark',
          description:
            'This row is your saved place for this profile—tap it to jump back to the same reading line. If you already had a bookmark for this spot, it is the same row. Use <strong>Next</strong> to see how to remove it with the trash icon.',
          side: 'left',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 160)
          },
        },
      },
      {
        element: () => {
          if (tourAddedBookmarkId) {
            const forTourBookmark = document.querySelector(
              `${BOOKMARKS_REMOVE}[data-bookmark-id="${escapeAttrSelectorValue(tourAddedBookmarkId)}"]`
            )
            if (forTourBookmark) return forTourBookmark
          }
          return (
            document.querySelector(BOOKMARKS_REMOVE) ??
            document.querySelector(BOOKMARKS_PANEL) ??
            document.body
          )
        },
        popover: {
          title: 'Remove a bookmark',
          description:
            'The trash icon deletes a row after you confirm. Use <strong>Next</strong> to remove the bookmark we just added (the tour confirms the dialog for you). If nothing new was added because this spot was already saved, <strong>Next</strong> simply continues.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            const id = tourAddedBookmarkId
            if (!id) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            const removeBtn = document.querySelector<HTMLElement>(
              `${BOOKMARKS_REMOVE}[data-bookmark-id="${escapeAttrSelectorValue(id)}"]`
            )
            if (!removeBtn) {
              tourAddedBookmarkId = null
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            removeBtn.click()
            void waitUntil(() => !!document.querySelector(ALERT_MODAL_CONFIRM), 4000)
              .then((hasModal) => {
                if (hasModal) {
                  document.querySelector<HTMLElement>(ALERT_MODAL_CONFIRM)?.click()
                }
                return waitUntil(() => !loadBookmarks().some((b) => b.id === id), 5000)
              })
              .then(() => {
                tourAddedBookmarkId = null
                window.setTimeout(() => {
                  drv.refresh()
                  drv.moveNext()
                }, prefersReducedMotion() ? 80 : 200)
              })
          },
        },
      },
      {
        element: BOOKMARKS_PANEL,
        popover: {
          title: 'All set',
          description:
            'Add bookmarks anytime from this panel; remove them with the trash icon when you no longer need them. **Done** closes the tour and this menu.',
          side: 'left',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            closeBookmarksPanelIfOpen()
            window.setTimeout(() => {
              closeBookmarksPanelIfOpen()
              drv.destroy()
            }, 0)
          },
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Spotlight tour for light / dark theme (header control).
 */

