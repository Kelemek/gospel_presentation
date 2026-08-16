import type { ProfileFeatureTourOptions } from './tourShared'
import {
  PROFILE_HIGHLIGHTS_PANEL,
  PROFILE_HIGHLIGHTS_TRIGGER,
  baseProfileHelpDriverConfig,
  closeBookmarksPanelIfOpen,
  createProfileHelpDriver,
  openHighlightsPanelIfClosed,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
} from './tourShared'

export function runHighlightsFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        closeBookmarksPanelIfOpen()
        options?.onAborted?.()
      },
      onComplete: () => {
        closeBookmarksPanelIfOpen()
        options?.onComplete?.()
      },
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_HIGHLIGHTS_TRIGGER,
        popover: {
          title: 'Highlights',
          description:
            'Tap the marker icon to see passages you have highlighted in gospel content. Select text in a section to save a highlight. Use <strong>Next</strong> to open the list.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_e, _s, { driver: drv }) => {
            openHighlightsPanelIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 120 : 280)
          },
        },
      },
      {
        element: PROFILE_HIGHLIGHTS_PANEL,
        popover: {
          title: 'Your highlights',
          description:
            'Open a row to jump to that quote, search to filter, or remove highlights you no longer need. Tap outside the panel or close when you are finished.',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Share this resource**: link or system share sheet. */

