import type { ProfileFeatureTourOptions } from './tourShared'
import {
  PROFILE_MENU_BUTTON,
  PROFILE_SLIDEOUT_MENU,
  TOC_SECTION_LINKS,
  TOC_SECTION_TOGGLE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  openProfileMenuIfClosed,
  prependSegmentIntroIfAny,
} from './tourShared'

export function runTableOfContentsFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the slide-out <strong>Menu</strong>. At the top you will find <strong>Resources</strong>, <strong>Text size</strong>, <strong>Print</strong>, and <strong>Bible translation</strong>, with <strong>Memorize</strong> just below <strong>Bible translation</strong>. Below that is <strong>Table of Contents</strong>—open it to jump to sections in this presentation. Use <strong>Next</strong> to open the slide-out for this tour.',
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
        element: () =>
          document.querySelector(TOC_SECTION_TOGGLE) ??
          document.querySelector(TOC_SECTION_LINKS) ??
          document.querySelector(PROFILE_SLIDEOUT_MENU) ??
          document.body,
        popover: {
          title: 'Table of Contents',
          description:
            'Open <strong>Table of Contents</strong>, expand a section, then tap a subsection to <strong>jump</strong> to that part of the page without leaving this profile. On a long presentation, expand nested rows for smaller headings. Matching anchors are also used when you <strong>bookmark</strong> your place.',
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

