import type { ProfileFeatureTourOptions } from './tourShared'
import {
  PROFILE_MENU_BUTTON,
  TEXT_SIZE_PANEL,
  TOC_TEXT_SIZE_TOGGLE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  openProfileMenuIfClosed,
  prependSegmentIntroIfAny,
} from './tourShared'

export function runTextSizeFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the table of contents, where you will find <strong>Text size</strong> and other controls. Use <strong>Next</strong> to open it for this tour.',
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
        element: TOC_TEXT_SIZE_TOGGLE,
        popover: {
          title: 'Text size',
          description:
            'Tap <strong>Text size</strong> to show reading size options for gospel presentation pages. Use <strong>Next</strong> to open the list for this tour.',
          side: 'right',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            const t = document.querySelector<HTMLElement>(TOC_TEXT_SIZE_TOGGLE)
            if (!t) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
              return
            }
            if (!document.querySelector(TEXT_SIZE_PANEL)) {
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
        element: TEXT_SIZE_PANEL,
        popover: {
          title: 'Comfortable reading',
          description:
            'Choose <strong>Normal</strong>, <strong>Larger</strong>, or <strong>Largest</strong>. The presentation text scales so sections and scripture stay easier to read. Your choice is saved in this browser and remembered the next time you visit. (Sizing applies on presentation pages, not on admin screens.)',
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Print tour: Menu closed first, then spotlights **Print Version** in the slide-out (web: browser print / PDF; native: system print).
 */

