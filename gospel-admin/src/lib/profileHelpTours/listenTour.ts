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
            'Tap <strong>Listen</strong> to open read-aloud for this presentation: choose where to start in the passage list, use <strong>Play</strong> / <strong>Pause</strong>, adjust speed, and optionally use <strong>read-along</strong> (underline on the page while it speaks). After you turn read-along on, pick <strong>Word</strong> to emphasize each word as it is read, or <strong>Line</strong> to highlight a whole line at a time. Use <strong>Next</strong> to open the panel for a closer look.',
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
            'Use the list to jump sections, <strong>Play</strong> to hear the current passage, and the speed control to slow down or speed up. The <strong>underline</strong> button turns read-along highlighting on or off; when it is on, tap <strong>Word</strong> or <strong>Line</strong> next to it to choose whether the highlight tracks a single word or spans the full line. When you are done, tap <strong>Close</strong> or finish this tour.',
          side: 'bottom',
          align: 'center',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Highlights**: saved quotes from section content. */

