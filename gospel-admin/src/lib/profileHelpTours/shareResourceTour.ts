import type { ProfileFeatureTourOptions } from './tourShared'
import {
  PROFILE_SHARE_RESOURCE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  prependSegmentIntroIfAny,
} from './tourShared'

export function runShareResourceFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_SHARE_RESOURCE,
        popover: {
          title: 'Share this resource',
          description:
            'Tap <strong>Share</strong> to copy a link to this presentation or use your device’s share sheet when available—handy for sending the same page to someone you are counseling or studying with.',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Text size tour: Menu closed first, then opens Text size in the slide-out (same drawer pattern as Resources).
 */

