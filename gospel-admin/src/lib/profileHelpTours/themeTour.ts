import {
  applyThemePersistenceSnapshot,
  readThemePersistenceSnapshot,
} from '@/contexts/ThemeContext'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  THEME_TOGGLE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
} from './tourShared'

export function runThemeFeatureTour(options?: ProfileFeatureTourOptions): void {
  const themeSnapshot = readThemePersistenceSnapshot()

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        applyThemePersistenceSnapshot(themeSnapshot)
        options?.onAborted?.()
      },
      onComplete: () => {
        applyThemePersistenceSnapshot(themeSnapshot)
        options?.onComplete?.()
      },
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Light and dark mode',
          description:
            'Tap the <strong>moon</strong> or <strong>sun</strong> icon to switch appearance. Your choice is saved in this browser. Use <strong>Next</strong> to flip the theme once so you can see the other look—we will restore your previous setting when the tour ends.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            document.querySelector<HTMLElement>(THEME_TOGGLE)?.click()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Switch anytime',
          description:
            'You should see the opposite mode now. Tap this control whenever you want to change it. <strong>Done</strong> restores whatever you had before this tour (a saved light/dark choice, or your device’s automatic setting if you had not picked one yet).',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Listen**: read-aloud for the presentation body. No-op when the control is not rendered. */

