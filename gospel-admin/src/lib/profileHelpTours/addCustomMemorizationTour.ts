import type { Alignment, DriveStep, Side } from 'driver.js'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  ADD_MEMORIZE_ADD,
  ADD_MEMORIZE_BOOK,
  ADD_MEMORIZE_CHAPTER,
  ADD_MEMORIZE_MODAL,
  ADD_MEMORIZE_TESTAMENTS,
  ADD_MEMORIZE_VERSE,
  MEMORIZE_ADD_VERSE,
  PROFILE_MENU_BUTTON,
  TOC_MEMORIZE_TOGGLE,
  baseProfileHelpDriverConfig,
  closeAddMemorizeModalIfOpen,
  closeBookmarksPanelIfOpen,
  closeProfileSlideoutMenuIfOpen,
  createProfileHelpDriver,
  isNarrowProfileHelpTourViewport,
  openMemorizePanelIfCollapsed,
  openProfileMenuIfClosed,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
  waitUntil,
} from './tourShared'

export function runAddCustomMemorizationFeatureTour(options?: ProfileFeatureTourOptions): void {
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  closeProfileSlideoutMenuIfOpen()
  closeBookmarksPanelIfOpen()
  closeAddMemorizeModalIfOpen()

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Tap the <strong>menu icon</strong> (top-left) to open the slide-out. <strong>Memorize</strong> sits just below <strong>Bible Translation</strong>. Use <strong>Next</strong> to open the menu for this tour.',
        side: 'bottom',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 380)
        },
      },
    },
    {
      element: TOC_MEMORIZE_TOGGLE,
      popover: {
        title: 'Memorize',
        description:
          'Tap <strong>Memorize</strong> to show your saved verses and reveal the <strong>+ Add</strong> button for adding new passages. Use <strong>Next</strong> to expand it for this tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          openMemorizePanelIfCollapsed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 220)
        },
      },
    },
    {
      element: MEMORIZE_ADD_VERSE,
      popover: {
        title: '+ Add',
        description:
          'Tap <strong>+ Add</strong> to open a picker for <strong>any</strong> book, chapter, and verse range—without opening the Scripture reader. Text is loaded in your <strong>current Bible translation</strong>. Use <strong>Next</strong> to open the picker for this tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLElement>(MEMORIZE_ADD_VERSE)
          if (!btn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          btn.click()
          void waitUntil(() => !!document.querySelector(ADD_MEMORIZE_MODAL), 6000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_TESTAMENTS) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Old or New Testament',
        description:
          'Start by choosing a <strong>testament</strong>. <strong>Old Testament</strong> lists <strong>Genesis → Malachi</strong>; <strong>New Testament</strong> lists <strong>Matthew → Revelation</strong>. The book list below updates to match. Use <strong>Next</strong> to continue with the <strong>Old Testament</strong> for this tour.',
        ...pop({ side: 'bottom', align: 'center' }),
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_BOOK) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Choose a book',
        description:
          'Each row is a <strong>book</strong> of the Bible. Tap one to reveal its <strong>chapters</strong> (long books scroll inside the list). Use <strong>Next</strong> to open <strong>Genesis</strong> for this tour.',
        ...pop({ side: 'right', align: 'start' }, { side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const bookBtn = document.querySelector<HTMLElement>(ADD_MEMORIZE_BOOK)
          if (!bookBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          bookBtn.click()
          void waitUntil(() => !!document.querySelector(ADD_MEMORIZE_CHAPTER), 4000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_CHAPTER) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Choose a chapter',
        description:
          'Each number is a <strong>chapter</strong>. Tap one and the <strong>verses</strong> for that chapter appear below. Use <strong>Next</strong> to pick <strong>chapter 1</strong> for this tour.',
        ...pop({ side: 'right', align: 'start' }, { side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const chapterBtn = document.querySelector<HTMLElement>(ADD_MEMORIZE_CHAPTER)
          if (!chapterBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          chapterBtn.click()
          void waitUntil(() => !!document.querySelector(ADD_MEMORIZE_VERSE), 4000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_VERSE) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Choose a verse',
        description:
          'Tap one verse to pick a <strong>single verse</strong>; tap a <strong>second</strong> verse to set a <strong>range</strong>. Tapping outside the range starts a new selection. Use <strong>Next</strong> to pick <strong>verse 1</strong> for this tour.',
        ...pop({ side: 'right', align: 'start' }, { side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const verseBtn = document.querySelector<HTMLElement>(ADD_MEMORIZE_VERSE)
          if (!verseBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          verseBtn.click()
          void waitUntil(
            () => {
              const addBtn = document.querySelector<HTMLButtonElement>(ADD_MEMORIZE_ADD)
              return !!addBtn && !addBtn.disabled
            },
            2000
          ).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_ADD) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Add',
        description:
          'Tap <strong>Add</strong> to save the passage. The app loads the text from your current translation and stores <strong>reference</strong>, <strong>text</strong>, and <strong>translation</strong> on this device. Duplicates (same reference and translation) are rejected. <strong>Done</strong> closes this tour without adding the verse.',
        ...pop({ side: 'top', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          closeAddMemorizeModalIfOpen()
          closeProfileSlideoutMenuIfOpen()
          window.setTimeout(() => {
            drv.destroy()
          }, 0)
        },
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    stagePadding: narrow ? 14 : 10,
    popoverOffset: narrow ? 26 : 10,
    ...(narrow
      ? {
          onHighlighted: (element, _step, { driver: drv }) => {
            if (element instanceof HTMLElement && element !== document.body) {
              element.scrollIntoView({
                block: 'center',
                inline: 'nearest',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              })
            }
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 0 : 140)
              })
            })
          },
        }
      : {}),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })

  d.drive()
}

/**
 * Table of contents tour: opens **Menu**, then highlights section/subsection links in the slide-out.
 */

