import type { ProfileFeatureTourOptions } from './tourShared'
import {
  PROFILE_MENU_BUTTON,
  TOC_PRINT_VERSION,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  openProfileMenuIfClosed,
  prependSegmentIntroIfAny,
} from './tourShared'

export function runPrintFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the table of contents, where you will find <strong>Print Version</strong> along with Resources, text size, and Bible translation. Use <strong>Next</strong> to open it for this tour.',
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
        element: TOC_PRINT_VERSION,
        popover: {
          title: 'Print version',
          description:
            'Tap <strong>Print Version</strong> when you want a paper copy or a PDF. The layout is tuned for letter-sized print: menus and other chrome are hidden so the gospel content reads cleanly. Output uses <strong>dark text on white</strong> even if you use dark mode on screen—better for printers and PDFs. In a browser you get the usual print or save-as-PDF dialog; in the native app, the system print sheet opens. Use <strong>Done</strong> to close this tour before printing if you prefer.',
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/** Builds popover HTML listing enabled translations (same source as the menu list). Exported for tests. */

