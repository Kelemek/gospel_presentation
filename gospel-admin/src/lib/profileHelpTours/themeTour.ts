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

function afterThemeToggleClick(drv: { refresh: () => void; moveNext: () => void }) {
  window.setTimeout(() => {
    drv.refresh()
    drv.moveNext()
  }, prefersReducedMotion() ? 80 : 200)
}

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
    /* No dim overlay — readers should see the full page while themes change */
    overlayOpacity: 0,
    overlayClickBehavior: () => {},
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Light, dark, and black mode',
          description:
            'Tap this control to cycle <strong>light → dark → black → light</strong>. The icon shows what comes next: <strong>moon</strong> (dark), <strong>filled circle</strong> (black), or <strong>sun</strong> (light). Your choice is saved in this browser. Your device’s automatic setting still only picks light or dark. Use <strong>Next</strong> to flip once—we will walk through all three looks, then restore your previous setting when the tour ends.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            document.querySelector<HTMLElement>(THEME_TOGGLE)?.click()
            afterThemeToggleClick(drv)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Second appearance',
          description:
            'You should see a different look now. Use <strong>Next</strong> once more to preview the third mode in the cycle.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            document.querySelector<HTMLElement>(THEME_TOGGLE)?.click()
            afterThemeToggleClick(drv)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Switch anytime',
          description:
            'You have seen all three appearances. Tap this control whenever you want to change it. <strong>Done</strong> restores whatever you had before this tour (a saved light, dark, or black choice, or your device’s automatic setting if you had not picked one yet).',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Listen**: read-aloud for the presentation body. No-op when the control is not rendered. */
