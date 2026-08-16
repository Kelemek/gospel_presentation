import type { ProfileFeatureTourOptions } from './tourShared'
import {
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  prependSegmentIntroIfAny,
  profileHelpRefreshDriverConfig,
  scriptureHoverPreviewTourIntroDescription,
} from './tourShared'

export function runScriptureHoverPreviewFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: () => document.body,
        onHighlightStarted: (_el, _step, { driver: drv }) => {
          profileHelpRefreshDriverConfig(drv, { stagePadding: 10, popoverOffset: 10 })
        },
        popover: {
          title: 'Quick verse preview',
          description: scriptureHoverPreviewTourIntroDescription(),
          align: 'center',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Greek / Hebrew word study tour: opens a scripture card, toggles **Greek** or **Hebrew** in the reader toolbar,
 * walks word chips (STEP Bible), and the lexicon bottom sheet (TBESG / TBESH).
 *
 * When not on `/default`, stores resume state and navigates there first (`tryStartWordStudyTourAfterNavigation`).
 */

