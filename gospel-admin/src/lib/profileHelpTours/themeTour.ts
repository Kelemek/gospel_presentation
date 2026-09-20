import {
  applyThemePersistenceSnapshot,
  readThemePersistenceSnapshot,
} from '@/contexts/ThemeContext'
import type { Theme } from '@/lib/profileTheme'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  THEME_TOGGLE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
} from './tourShared'

const THEME_PANEL = '[data-tour="theme-panel"]'

function afterThemeTourStep(drv: { refresh: () => void; moveNext: () => void }) {
  window.setTimeout(() => {
    drv.refresh()
    drv.moveNext()
  }, prefersReducedMotion() ? 80 : 200)
}

function pickThemeOption(value: Theme, onDone?: () => void): void {
  const clickOption = () => {
    document.querySelector<HTMLElement>(`[data-theme-option="${value}"]`)?.click()
    onDone?.()
  }

  if (document.querySelector(THEME_PANEL)) {
    clickOption()
    return
  }

  document.querySelector<HTMLElement>(THEME_TOGGLE)?.click()
  window.requestAnimationFrame(() => {
    clickOption()
  })
}

function runThemeTourPick(value: Theme, drv: { refresh: () => void; moveNext: () => void }) {
  pickThemeOption(value, () => afterThemeTourStep(drv))
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
          title: 'Light, Blossom, dark, and black',
          description:
            'Tap this appearance icon to open the menu—it shows your current look. Choose <strong>Light</strong>, <strong>Blossom</strong> (soft pinks and lavenders), <strong>Dark</strong>, or <strong>Black</strong>—each row shows an icon and name. Your choice is saved in this browser. Your device’s automatic setting still only picks light or dark. Use <strong>Next</strong> to preview <strong>Dark</strong>, then <strong>Blossom</strong> and <strong>Black</strong>; we restore your previous setting when the tour ends.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            runThemeTourPick('dark', drv)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Second appearance',
          description:
            'You should see a different look now. Use <strong>Next</strong> to preview <strong>Blossom</strong> from the same menu.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            runThemeTourPick('blossom', drv)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Third appearance',
          description:
            'Use <strong>Next</strong> once more to preview <strong>Black</strong>.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            runThemeTourPick('black', drv)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Switch anytime',
          description:
            'You have seen several appearances. Open this menu whenever you want to change it. <strong>Done</strong> restores whatever you had before this tour (a saved light, blossom, dark, or black choice, or your device’s automatic setting if you had not picked one yet).',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Listen**: read-aloud for the presentation body. No-op when the control is not rendered. */
