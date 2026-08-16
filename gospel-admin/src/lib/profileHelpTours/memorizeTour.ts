import type { Alignment, DriveStep, Driver, Side } from 'driver.js'
import { loadMemorizedVerses } from '@/lib/verseMemorizationStorage'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  ALERT_MODAL_CONFIRM,
  ALERT_MODAL_OK,
  MEMORIZE_LISTEN_CLOSE,
  MEMORIZE_LISTEN_OPEN,
  MEMORIZE_LISTEN_PASSAGE,
  MEMORIZE_LISTEN_REPEAT,
  MEMORIZE_LISTEN_SPEED,
  MEMORIZE_PANEL,
  MEMORIZE_PRACTICE_CLOSE,
  MEMORIZE_PRACTICE_DIALOG,
  MEMORIZE_PRACTICE_MODE_INITIALS,
  MEMORIZE_PRACTICE_MODE_PICKER,
  MEMORIZE_PRACTICE_MODE_REORDER,
  MEMORIZE_PRACTICE_MODE_TYPE,
  MEMORIZE_PRACTICE_MODE_WORD,
  MEMORIZE_READ_ALOUD_TOUR_STEPS,
  MEMORIZE_START_PRACTICE,
  MEMORIZE_TOUR_RESUME_STORAGE_KEY,
  PROFILE_MENU_BUTTON,
  SCRIPTURE_CARD,
  SCRIPTURE_MODAL_CLOSE,
  SCRIPTURE_MODAL_MEMORIZE,
  SCRIPTURE_MODAL_TOOLBAR,
  SCRIPTURE_READER_TOUR_DEFAULT_SLUG,
  SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY,
  ScriptureReaderTourResumePayloadV1,
  TOC_MEMORIZE_TOGGLE,
  baseProfileHelpDriverConfig,
  closeBookmarksPanelIfOpen,
  closeProfileSlideoutMenuIfOpen,
  createProfileHelpDriver,
  escapeAttrSelectorValue,
  isDefaultProfilePath,
  isNarrowProfileHelpTourViewport,
  modalVerseBodyHasText,
  openProfileMenuIfClosed,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
  reopenMemorizeMenuAndPanelForTour,
  resolveMemorizeTourTargetVerseIdAfterAdd,
  scriptureReaderTourNavigation,
  waitUntil,
} from './tourShared'
import { getFullWalkthroughIndexAfterMemorize } from './fullWalkthroughSegments'

export function runMemorizeFeatureTour(options?: ProfileFeatureTourOptions): void {
  if (typeof window === 'undefined') return
  if (!isDefaultProfilePath(window.location.pathname)) {
    const payload: ScriptureReaderTourResumePayloadV1 = {
      v: 1,
      captiveForTour: options?.captive === true,
      continueFullWalkthroughAt:
        options?.captive === true ? getFullWalkthroughIndexAfterMemorize() : undefined,
      segmentIntro: options?.segmentIntro,
    }
    try {
      sessionStorage.removeItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.setItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      runMemorizeFeatureTourOnCurrentPage(options)
      return
    }
    scriptureReaderTourNavigation.assign(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
    return
  }
  runMemorizeFeatureTourOnCurrentPage(options)
}

/**
 * When **Listen** is not in the DOM (e.g. some Android + non-ESV), skip the read-aloud substeps in one jump.
 */
function skipReadAloudTourIfListenButtonMissing(drv: Driver): boolean {
  if (document.querySelector(MEMORIZE_LISTEN_OPEN) != null) return false
  const i = drv.getActiveIndex()
  if (i === undefined) return true
  drv.moveTo(i + MEMORIZE_READ_ALOUD_TOUR_STEPS)
  return true
}

/** After mode-picker steps, start **Type mode** so the tour can continue with Listen + typing preview. */
function clickMemorizeTourTypeModeAndAdvanceToListenBlock(drv: Driver): void {
  document.querySelector<HTMLElement>(MEMORIZE_PRACTICE_MODE_TYPE)?.click()
  void waitUntil(
    () => !!document.querySelector('[data-testid="memorize-practice-words"]'),
    6000
  ).then(() => {
    window.setTimeout(() => {
      drv.refresh()
      drv.moveNext()
    }, prefersReducedMotion() ? 80 : 200)
  })
}

export function runMemorizeFeatureTourOnCurrentPage(options?: ProfileFeatureTourOptions): void {
  let memorizeTourTargetVerseId: string | null = null
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  closeProfileSlideoutMenuIfOpen()
  closeBookmarksPanelIfOpen()

  const steps: DriveStep[] = [
    {
      element: SCRIPTURE_CARD,
      popover: {
        title: 'Open a scripture card',
        description:
          'Blue cards list passages for this section. Tap one to read—or use <strong>Next</strong> to open the first card for this tour.',
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
      element: SCRIPTURE_MODAL_MEMORIZE,
      popover: {
        title: 'Save for memorization',
        description:
          'Tap <strong>Memorize</strong> in the reader header to save this passage on this device (reference, text, and translation). If it is already saved, the button is disabled and we will skip ahead. Use <strong>Next</strong> to save (or continue).',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const tryAdvance = (): void => {
            memorizeTourTargetVerseId = resolveMemorizeTourTargetVerseIdAfterAdd()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          }
          const btn = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_MEMORIZE)
          if (btn?.disabled) {
            tryAdvance()
            return
          }
          btn?.click()
          void waitUntil(() => !!document.querySelector(ALERT_MODAL_OK), 6000).then((hasOk) => {
            if (hasOk) document.querySelector<HTMLElement>(ALERT_MODAL_OK)?.click()
            tryAdvance()
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_CLOSE,
      popover: {
        title: 'Close the reader',
        description: 'Use <strong>Next</strong> to close the Scripture reader and return to the page.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_CLOSE)?.click()
          void waitUntil(() => !document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 5000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Open the slide-out to find <strong>Memorize</strong> just below <strong>Bible Translation</strong>. Use <strong>Next</strong> to open the menu.',
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
          'Tap <strong>Memorize</strong> to show your saved verses. Use <strong>Next</strong> to expand the list for this tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const t = document.querySelector<HTMLElement>(TOC_MEMORIZE_TOGGLE)
          if (!t) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
            return
          }
          if (!document.querySelector(MEMORIZE_PANEL)) {
            t.click()
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 220)
        },
      },
    },
    {
      element: MEMORIZE_PANEL,
      popover: {
        title: 'Your memorization list',
        description:
          'Verses are grouped by progress—<strong>Learning</strong>, <strong>Practicing</strong>, and <strong>Mastered</strong>. Tap the <strong>left side of a row</strong> (reference and details) to open guided practice—five rounds with blanks for each word (and digits in the reference). The <strong>trash</strong> icon on the right removes a verse after you confirm. Use <strong>Next</strong> to open practice for the verse we added and preview how it works.',
        ...pop({ side: 'right', align: 'start' }),
      },
    },
    {
      element: () => {
        const id = memorizeTourTargetVerseId
        if (!id) return document.querySelector(MEMORIZE_PANEL) ?? document.body
        const practiceBtn = document.querySelector<HTMLElement>(
          `button[data-memorize-verse-practice="${escapeAttrSelectorValue(id)}"]`
        )
        if (practiceBtn) {
          // Spotlight the full row (left tap target + remove control), not just the text button; matches the “row” copy.
          return practiceBtn.closest<HTMLElement>('[role="listitem"]') ?? practiceBtn
        }
        return document.querySelector(MEMORIZE_PANEL) ?? document.body
      },
      popover: {
        title: 'Open practice from the list',
        description:
          'Use <strong>Next</strong> to open the practice session for the verse we added (same as tapping that verse’s <strong>row on the left</strong>).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const id = memorizeTourTargetVerseId
          if (!id) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          const practiceBtn = document.querySelector<HTMLElement>(
            `button[data-memorize-verse-practice="${escapeAttrSelectorValue(id)}"]`
          )
          if (!practiceBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          practiceBtn.click()
          void waitUntil(() => !!document.querySelector(MEMORIZE_PRACTICE_DIALOG), 8000).then((opened) => {
            if (!opened) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
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
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.querySelector(MEMORIZE_PANEL) ??
        document.body,
      popover: {
        title: 'Before you practice',
        description:
          'You see the full verse and reference first. The <strong>Round</strong> dropdown in the footer sets which of the five rounds you begin on (round 1 is easiest). When you are ready, <strong>Start practice</strong> opens <strong>Choose practice mode</strong>. Use <strong>Next</strong> to open that dialog for the tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const start = document.querySelector<HTMLElement>(MEMORIZE_START_PRACTICE)
          if (start) {
            start.click()
            void waitUntil(() => !!document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER), 4000).then((opened) => {
              if (!opened) {
                window.setTimeout(() => {
                  drv.refresh()
                  drv.moveNext()
                }, 120)
                return
              }
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, prefersReducedMotion() ? 80 : 200)
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
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_TYPE) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Choose practice mode',
        description:
          'Pick how you want to work through the <strong>same five rounds</strong>: all paths end at round 5—in <strong>Type</strong>, <strong>Initials</strong>, and <strong>Word</strong> mode more words are hidden each round (Initials hides every blank and shows an initials hint line); in <strong>Reorder</strong> mode more phrase chunks are shuffled. Use <strong>Next</strong> to walk <strong>Type</strong> → <strong>Initials</strong> → <strong>Word</strong> → <strong>Reorder</strong>, then the tour continues in <strong>Type mode</strong> for Listen and typing.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_TYPE) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.body,
      popover: {
        title: 'Type mode',
        description:
          '<strong>Type mode</strong> uses the keyboard: type the <strong>first letter</strong> of each blank word and each <strong>digit</strong> in the reference (punctuation stays on screen). Use <strong>Next</strong> to see <strong>Initials mode</strong>.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_INITIALS) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Initials mode',
        description:
          '<strong>Initials mode</strong> still uses the keyboard like Type, but every blank is hidden and a separate <strong>initials hint</strong> line shows the first letter of each word (and digits for the reference) so you can work from cues. Use <strong>Next</strong> to see <strong>Word mode</strong>.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_WORD) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.body,
      popover: {
        title: 'Word mode',
        description:
          '<strong>Word mode</strong> skips the keyboard: tap <strong>word</strong> choices and <strong>digit</strong> buttons in the bottom bar instead. Use <strong>Next</strong> to see <strong>Reorder mode</strong>.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_REORDER) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.body,
      popover: {
        title: 'Reorder mode',
        description:
          '<strong>Reorder mode</strong> splits the verse into <strong>draggable chunks</strong> you put back in reading order, with the <strong>reference</strong> as separate pieces (book, chapter number, verse); a colon appears between chapter and verse but is not a chip. Hold <strong>Hint</strong> like other modes to peek at the first section still wrong. Use <strong>Next</strong> to start round 1 in <strong>Type mode</strong> for the rest of the tour (Listen, then blanks).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          clickMemorizeTourTypeModeAndAdvanceToListenBlock(drv)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_OPEN) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Listen',
        description:
          '**Listen** in the session header opens the <strong>Listen</strong> panel. Use it during intro and typing rounds. Use <strong>Next</strong> to open the panel for a quick look (or skip ahead if you do not see **Listen** on this device).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          if (skipReadAloudTourIfListenButtonMissing(drv)) return
          document.querySelector<HTMLElement>(MEMORIZE_LISTEN_OPEN)?.click()
          void waitUntil(() => !!document.querySelector(MEMORIZE_LISTEN_PASSAGE), 5000).then((opened) => {
            window.setTimeout(() => {
              drv.refresh()
              if (opened) {
                drv.moveNext()
              } else {
                const i = drv.getActiveIndex() ?? 0
                drv.moveTo(i + MEMORIZE_READ_ALOUD_TOUR_STEPS)
              }
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_PASSAGE) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Play or Pause',
        description:
          '**Play** (or <strong>Pause</strong> while it is running) the passage. ESV uses streamed audio; other translations use the device reader for your saved line. Use <strong>Next</strong> to continue.',
        ...pop({ side: 'top', align: 'center' }, { side: 'bottom', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_REPEAT) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Repeat',
        description:
          'Turn <strong>Repeat</strong> on to loop the read-aloud with a short pause between plays; turn it off to stop after the current one. Use <strong>Next</strong> to continue.',
        ...pop({ side: 'top', align: 'center' }, { side: 'bottom', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_SPEED) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Speed',
        description:
          'Choose <strong>read-aloud speed</strong>; your last choice is remembered. Use <strong>Next</strong> to continue.',
        ...pop({ side: 'top', align: 'center' }, { side: 'bottom', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_CLOSE) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Close read aloud',
        description:
          'When you are done, close this panel to return to practice. Use <strong>Next</strong> to close it for the tour and continue.',
        ...pop({ side: 'top', align: 'center' }, { side: 'bottom', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void (async () => {
            const close = document.querySelector<HTMLElement>(MEMORIZE_LISTEN_CLOSE)
            close?.click()
            await waitUntil(() => !document.querySelector(MEMORIZE_LISTEN_PASSAGE), 5000)
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })()
        },
      },
    },
    {
      element: () =>
        document.querySelector('[data-testid="memorize-practice-words"]') ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.querySelector(MEMORIZE_PANEL) ??
        document.body,
      popover: {
        title: 'Guided practice',
        description:
          'Blanks mark what to fill next—in <strong>Type mode</strong>: <strong>first letter</strong> of each word, or each <strong>digit</strong> in the reference. <strong>Word mode</strong> uses <strong>buttons</strong> (from the verse) instead of the keyboard. <strong>Hint</strong> temporarily peeks at hidden words. Use <strong>Next</strong> to close this preview and return to the list.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void (async () => {
            const closeBtn = document.querySelector<HTMLElement>(MEMORIZE_PRACTICE_CLOSE)
            if (closeBtn) {
              closeBtn.click()
              await waitUntil(() => !document.querySelector(MEMORIZE_PRACTICE_DIALOG), 6000)
            }
            await reopenMemorizeMenuAndPanelForTour()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })()
        },
      },
    },
    {
      element: () => {
        const id = memorizeTourTargetVerseId
        if (!id) return document.querySelector(MEMORIZE_PANEL) ?? document.body
        const removeBtn = document.querySelector<HTMLElement>(
          `button[data-memorize-verse-id="${escapeAttrSelectorValue(id)}"]`
        )
        if (removeBtn) {
          // The button cell is a tall strip; the trash glyph is a small icon—spotlight the SVG so the ring matches the delete control.
          return removeBtn.querySelector('svg') ?? removeBtn
        }
        return document.querySelector(MEMORIZE_PANEL) ?? document.body
      },
      popover: {
        title: 'Remove this verse',
        description:
          'Use <strong>Next</strong> to remove the verse we added for this tour via the <strong>trash</strong> icon (the tour confirms the dialog for you).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const id = memorizeTourTargetVerseId
          if (!id) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          const removeBtn = document.querySelector<HTMLElement>(
            `button[data-memorize-verse-id="${escapeAttrSelectorValue(id)}"]`
          )
          if (!removeBtn) {
            memorizeTourTargetVerseId = null
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          removeBtn.click()
          void waitUntil(() => !!document.querySelector(ALERT_MODAL_CONFIRM), 4000)
            .then((hasModal) => {
              if (hasModal) document.querySelector<HTMLElement>(ALERT_MODAL_CONFIRM)?.click()
              return waitUntil(() => !loadMemorizedVerses().some((v) => v.id === id), 5000)
            })
            .then(() => {
              memorizeTourTargetVerseId = null
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, prefersReducedMotion() ? 80 : 200)
            })
        },
      },
    },
    {
      element: MEMORIZE_PANEL,
      popover: {
        title: 'All set',
        description:
          'You can add verses anytime from the Scripture reader and manage them here. **Done** closes the tour and the menu.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          closeProfileSlideoutMenuIfOpen()
          window.setTimeout(() => {
            closeProfileSlideoutMenuIfOpen()
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
