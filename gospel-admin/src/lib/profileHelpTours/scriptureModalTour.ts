import type { Alignment, DriveStep, Side } from 'driver.js'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  MEMORIZE_TOUR_RESUME_STORAGE_KEY,
  PROFILE_MENU_BUTTON,
  PROFILE_SLIDEOUT_MENU,
  SCRIPTURE_CARD,
  SCRIPTURE_MODAL_CHAPTER_BODY,
  SCRIPTURE_MODAL_CLOSE,
  SCRIPTURE_MODAL_COMPARE,
  SCRIPTURE_MODAL_COMPARE_COLUMNS,
  SCRIPTURE_MODAL_NEXT,
  SCRIPTURE_MODAL_PIN_COLOR,
  SCRIPTURE_MODAL_PREV,
  SCRIPTURE_MODAL_SCROLL_AREA,
  SCRIPTURE_MODAL_TOOLBAR,
  SCRIPTURE_MODAL_VERSE_BODY,
  SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE,
  SCRIPTURE_PROGRESS_UNPIN,
  SCRIPTURE_READER_TOUR_DEFAULT_SLUG,
  SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY,
  SCRIPTURE_VERSE_PINNED_CARD,
  ScriptureReaderTourResumePayloadV1,
  TOC_RESET_PROGRESS,
  TOC_VERSE_PINS,
  baseProfileHelpDriverConfig,
  compareColumnsVisible,
  clearCompareTranslationSelectAsync,
  createProfileHelpDriver,
  isDefaultProfilePath,
  isNarrowProfileHelpTourViewport,
  modalSingleVerseViewReady,
  modalVerseBodyHasText,
  openProfileMenuIfClosed,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
  selectFirstCompareTranslationOptionAsync,
  scriptureReaderTourNavigation,
  waitUntil,
} from './tourShared'
import { getFullWalkthroughIndexAfterScriptureReader } from './fullWalkthroughSegments'

export function runScriptureModalFeatureTour(options?: ProfileFeatureTourOptions): void {
  if (typeof window === 'undefined') return
  if (!isDefaultProfilePath(window.location.pathname)) {
    const payload: ScriptureReaderTourResumePayloadV1 = {
      v: 1,
      captiveForTour: options?.captive === true,
      continueFullWalkthroughAt:
        options?.captive === true ? getFullWalkthroughIndexAfterScriptureReader() : undefined,
      segmentIntro: options?.segmentIntro,
    }
    try {
      sessionStorage.removeItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.setItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      runScriptureModalFeatureTourOnCurrentPage(options)
      return
    }
    scriptureReaderTourNavigation.assign(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
    return
  }
  runScriptureModalFeatureTourOnCurrentPage(options)
}

export function runScriptureModalFeatureTourOnCurrentPage(options?: ProfileFeatureTourOptions): void {
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  const steps: DriveStep[] = [
    {
      element: SCRIPTURE_CARD,
      popover: {
        title: 'Open a scripture card',
        description:
          'Blue cards list passages for this section. Tap one to read it in full—or use <strong>Next</strong> to open the first card for this tour.',
        ...pop({ side: 'top', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_CARD)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 12000).then(() => {
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_VERSE_BODY) ?? document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      popover: {
        title: 'The passage',
        description:
          'The verse or range appears here in the translation you chose in the menu (or the site default). Use the toolbar above to compare, switch between verse-only and full-chapter views, or move to another passage.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_COMPARE,
      popover: {
        title: 'Compare translations',
        description:
          'Open <strong>Compare</strong> and pick a second version to read the same passage beside your main translation (only translations your church enables appear; the list never repeats the one you are already reading). Tap <strong>Next</strong> to open <strong>Compare</strong> and choose a second translation for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void (async () => {
            const applied = await selectFirstCompareTranslationOptionAsync()
            if (!applied) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            await waitUntil(() => compareColumnsVisible() && modalVerseBodyHasText(), 18000)
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })()
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_COMPARE_COLUMNS) ??
        document.querySelector(SCRIPTURE_MODAL_VERSE_BODY) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      onHighlighted: (_el, _step, { driver: drv }) => {
        window.requestAnimationFrame(() => {
          drv.refresh()
        })
      },
      popover: {
        title: narrow ? 'Top and bottom' : 'Two columns',
        description: narrow
          ? 'Each block shows the same reference in a different translation. On smaller screens they stack: the <strong>compare</strong> translation is on <strong>top</strong> and your <strong>main</strong> translation is below. Attribution still appears at the bottom when you scroll.'
          : 'Each column shows the same reference in a different translation. Main translation is on the right; the compare column is on the left. Attribution still appears at the bottom when you scroll.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_COMPARE,
      popover: {
        title: 'Turn off compare',
        description:
          'Open <strong>Compare</strong> again and pick the first row (<strong>Compare</strong>) to return to a single column—or tap <strong>Next</strong> and the tour will do it for you.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void clearCompareTranslationSelectAsync().then(() => {
            void waitUntil(() => !compareColumnsVisible() && modalVerseBodyHasText(), 12000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE,
      popover: {
        title: 'Chapter context',
        description:
          'Tap <strong>Chapter</strong> on this control to load the whole chapter. Your verses stay highlighted in the longer text so you can see what comes before and after. Use <strong>Next</strong> to load it now.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_CHAPTER_BODY), 15000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 300)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_SCROLL_AREA) ??
        document.querySelector(SCRIPTURE_MODAL_CHAPTER_BODY) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      onHighlighted: (_el, _step, { driver: drv }) => {
        window.requestAnimationFrame(() => {
          drv.refresh()
        })
      },
      popover: {
        title: 'Verse in context',
        description:
          'Scroll inside this area to explore the chapter. The passage you opened is marked so it is easy to spot inside the surrounding verses.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE,
      popover: {
        title: 'Back to single verse',
        description:
          'The same control now shows <strong>Verse</strong>. Tap it to leave chapter view and return to just the passage you opened—compact and easy to read. Use <strong>Next</strong> to switch back for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE)?.click()
          void waitUntil(() => modalSingleVerseViewReady(), 12000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_NEXT,
      popover: {
        title: 'Next passage',
        description:
          'The heading in the center shows the active reference. Tap <strong>▶</strong> (or swipe left on mobile) to jump to the <strong>next</strong> scripture card in profile order—the text updates to that passage. Use <strong>Next</strong> to try it (disabled if there is only one card).',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_NEXT)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 250)
            })
            return
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 120)
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_PREV,
      popover: {
        title: 'Previous passage',
        description:
          'Tap <strong>◀</strong> (or swipe right) to go <strong>back</strong> to the prior card—the heading and passage text change again so you can step through the outline in order. Use <strong>Next</strong> to try it (disabled if you are on the first card).',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_PREV)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 250)
            })
            return
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_PIN_COLOR) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR) ??
        document.body,
      popover: {
        title: 'Pin a passage (optional)',
        description:
          'Use the <strong>pin</strong> button when this passage came from a scripture <strong>card</strong> on the profile (not Bible Reader). Open bookmark tints (<strong>red</strong>, <strong>blue</strong>, <strong>green</strong>, <strong>violet</strong>)—saved when you <strong>close</strong> the reader (this device only). The control shows <strong>yellow</strong> for “last verse viewed”; leave it unchanged or pick a menu tint. Clearing pins uses the 📌 on the card or **Clear pinned passages** in the menu. Use <strong>Next</strong> to choose a menu tint for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const root = document.querySelector(SCRIPTURE_MODAL_PIN_COLOR)
          const trigger = root?.querySelector<HTMLButtonElement>('[data-tour="scripture-modal-pin-trigger"]')
          if (
            trigger &&
            !trigger.disabled &&
            !root?.querySelector<HTMLButtonElement>('[role="option"][data-pin-slot]')
          ) {
            trigger.click()
          }
          void waitUntil(
            () => !!root?.querySelector<HTMLButtonElement>('[role="option"][data-pin-slot]'),
            3000
          ).then(() => {
            root?.querySelector<HTMLButtonElement>('[role="option"][data-pin-slot]')?.click()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 160)
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_CLOSE,
      popover: {
        title: 'Close when you are done',
        description:
          'Tap <strong>×</strong> to return to the presentation. Use <strong>Next</strong> to close for this tour.',
        ...pop({ side: 'left', align: 'start' }, { side: 'bottom', align: 'end' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_CLOSE)?.click()
          void waitUntil(() => !document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 5000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 400)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_VERSE_PINNED_CARD) ?? document.querySelector(SCRIPTURE_CARD) ?? document.body,
      popover: {
        title: 'Pinned passage',
        description:
          'The prior step saves a colored <strong>pin</strong> on this passage. Pinned cards stay <strong>tinted and bold</strong> so you can spot them quickly—tints like red and blue can repeat on different passages when you bookmark more of them; <strong>yellow</strong> tracks your latest passage unless another tint bookmarks that verse. The next step spotlights the mini <strong>pin</strong> on the card (one tap removes that bookmark). Then we open the <strong>menu</strong> for the pin list and clear-all control.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_PROGRESS_UNPIN) ??
        document.querySelector(SCRIPTURE_VERSE_PINNED_CARD) ??
        document.querySelector(SCRIPTURE_CARD) ??
        document.body,
      popover: {
        title: 'Pin on the card',
        description:
          'Tap the colored <strong>pin</strong> to remove <strong>only that bookmark</strong> (or yellow’s last-passage marker). <strong>Clear pinned passages</strong> in the menu removes every pin at once. This tour skips unpinning so the next steps can show the menu.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Pins in the menu',
        description:
          'Pinned passages are listed at the <strong>bottom</strong> of the slide-out menu (under profile details). Use <strong>Next</strong> to open the <strong>menu</strong> and scroll there.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
          const settleMs = prefersReducedMotion() ? 120 : 680
          void waitUntil(() => !!document.querySelector(TOC_VERSE_PINS), 5000).then(() => {
            document.querySelector(TOC_VERSE_PINS)?.scrollIntoView({
              block: 'nearest',
              behavior,
            })
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, settleMs)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(TOC_VERSE_PINS) ??
        document.querySelector(PROFILE_SLIDEOUT_MENU) ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const versePinsBlock = document.querySelector<HTMLElement>(TOC_VERSE_PINS)
        versePinsBlock?.scrollIntoView({
          block: 'nearest',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.setTimeout(() => {
              drv.refresh()
            }, prefersReducedMotion() ? 0 : 100)
          })
        })
      },
      popover: {
        title: 'Pinned passages',
        description:
          'This block lists bookmarks and your yellow “last verse” marker and matches the <strong>tinted cards</strong> on the page. Use <strong>Next</strong> to spotlight <strong>Clear pinned passages</strong>.',
        ...pop({ side: 'right', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(TOC_RESET_PROGRESS) ??
        document.querySelector(TOC_VERSE_PINS) ??
        document.querySelector(PROFILE_SLIDEOUT_MENU) ??
        document.body,
      popover: {
        title: 'Clear pinned passages',
        description:
          'Tap <strong>Clear pinned passages</strong> when you want every pin gone for this presentation. Use <strong>Next</strong> (or <strong>Done</strong>) and the tour will tap it for you—then the tour ends while the page updates.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(TOC_RESET_PROGRESS)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => !document.querySelector(SCRIPTURE_VERSE_PINNED_CARD), 8000).then(() => {
              window.setTimeout(() => {
                drv.destroy()
              }, 200)
            })
            return
          }
          window.setTimeout(() => {
            drv.destroy()
          }, 80)
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
 * Resources tour: starts with the slide-out **closed** so step 1 can spotlight the header Menu control
 * (it sits under the drawer when open). Prefetches `/api/profiles/public-templates` for category names/count,
 * then uses Next handlers to open the menu and expand Resources before later steps.
 */

