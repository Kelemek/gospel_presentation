import type { ProfileFeatureTourOptions } from './tourShared'
import {
  PROFILE_RESOURCE_LISTEN_DIALOG,
  PROFILE_RESOURCE_READ_ALOUD,
  baseProfileHelpDriverConfig,
  clearDriverBodyClasses,
  closeProfileResourceListenDialogIfOpen,
  createProfileHelpDriver,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
} from './tourShared'
import { isProfileResourceListenControlAvailable } from '@/lib/profileListenAvailability'

export function runProfileListenFeatureTour(options?: ProfileFeatureTourOptions): void {
  const finish = (): void => {
    closeProfileResourceListenDialogIfOpen()
    clearDriverBodyClasses()
    options?.onComplete?.()
  }
  const abort = (): void => {
    closeProfileResourceListenDialogIfOpen()
    clearDriverBodyClasses()
    options?.onAborted?.()
  }

  if (!isProfileResourceListenControlAvailable()) {
    finish()
    return
  }
  if (!document.querySelector(PROFILE_RESOURCE_READ_ALOUD)) {
    finish()
    return
  }

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: abort,
      onComplete: finish,
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_RESOURCE_READ_ALOUD,
        popover: {
          title: 'Listen',
          description:
            'Tap <strong>Listen</strong> to open read-aloud for this presentation: choose where to start in the passage list, use <strong>Play</strong> / <strong>Pause</strong>, and adjust speed. The page auto-scrolls to follow the spoken line. Use <strong>Next</strong> to open the panel for a closer look.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_e, _s, { driver: drv }) => {
            document.querySelector<HTMLElement>(PROFILE_RESOURCE_READ_ALOUD)?.click()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 120 : 280)
          },
        },
      },
      {
        element: PROFILE_RESOURCE_LISTEN_DIALOG,
        popover: {
          title: 'Read-aloud controls',
          description:
            'Use the list to jump sections, <strong>Play</strong> to hear the current passage, and the speed control to slow down or speed up. While it plays, the page scrolls to keep the current line in view. When you are done, tap <strong>Close</strong> or finish this tour.',
          side: 'bottom',
          align: 'center',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Highlights**: saved quotes from section content. */

