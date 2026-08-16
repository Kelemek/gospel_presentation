import type { ProfileFeatureTourOptions } from './tourShared'
import {
  BIBLE_TRANSLATION_PANEL,
  PROFILE_MENU_BUTTON,
  TOC_BIBLE_TRANSLATION_TOGGLE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  escapeForPopoverText,
  openProfileMenuIfClosed,
  prependSegmentIntroIfAny,
} from './tourShared'

export function buildBibleTranslationTourPopoverDescription(
  enabled: ReadonlyArray<{ translation_name: string }>
): string {
  const names = enabled
    .map((o) => o.translation_name.trim())
    .filter((n) => n.length > 0)
  const listSource = names.length > 0 ? names : ['ESV (English Standard Version)']
  const listItems = listSource
    .map((n) => `<li><strong>${escapeForPopoverText(n)}</strong></li>`)
    .join('')
  return (
    '<p>Choose which Bible version opens when you tap a reference. ' +
    '<strong>Translations available</strong> in your menu right now:</p>' +
    `<ul class="list-disc pl-5 mt-2 text-sm">${listItems}</ul>` +
    '<p class="mt-2">The setting applies to scripture modals and quoted passages on presentation pages. ' +
    'Your choice is saved in this browser for the next time you visit.</p>'
  )
}

async function fetchEnabledTranslationsForBibleTour(): Promise<{ translation_name: string }[]> {
  try {
    const res = await fetch('/api/translations/enabled')
    if (!res.ok) {
      return [{ translation_name: 'ESV (English Standard Version)' }]
    }
    const data: unknown = await res.json()
    const raw = data as { translations?: unknown } | null | undefined
    const list = raw?.translations
    if (!Array.isArray(list) || list.length === 0) {
      return [{ translation_name: 'ESV (English Standard Version)' }]
    }
    return list.map((t: { translation_name?: string; translation_code?: string }) => ({
      translation_name:
        typeof t.translation_name === 'string' && t.translation_name.trim() !== ''
          ? t.translation_name.trim()
          : String(t.translation_code ?? '').toUpperCase(),
    }))
  } catch {
    return [{ translation_name: 'ESV (English Standard Version)' }]
  }
}

/**
 * Bible translation tour: Menu → **Bible Translation** button (step 2) → opens list on Next → panel (step 3), same pattern as Text size.
 * Prefetches `/api/translations/enabled` so the popover lists the same translations as the menu.
 */
export function runBibleTranslationFeatureTour(options?: ProfileFeatureTourOptions): void {
  void runBibleTranslationFeatureTourAsync(options)
}

async function runBibleTranslationFeatureTourAsync(options?: ProfileFeatureTourOptions): Promise<void> {
  const enabled = await fetchEnabledTranslationsForBibleTour()
  const descriptionHtml = buildBibleTranslationTourPopoverDescription(enabled)

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the table of contents, where you will find <strong>Bible Translation</strong> (under <strong>Print Version</strong>) and other controls. Use <strong>Next</strong> to open the menu for this tour.',
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
        element: TOC_BIBLE_TRANSLATION_TOGGLE,
        popover: {
          title: 'Bible translation',
          description:
            'Tap <strong>Bible Translation</strong> to show the versions available for scripture (same pattern as <strong>Text size</strong>). Use <strong>Next</strong> to open the list for this tour.',
          side: 'right',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            const t = document.querySelector<HTMLElement>(TOC_BIBLE_TRANSLATION_TOGGLE)
            if (!t) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
              return
            }
            if (!document.querySelector(BIBLE_TRANSLATION_PANEL)) {
              t.click()
            }
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 220)
          },
        },
      },
      {
        element: BIBLE_TRANSLATION_PANEL,
        popover: {
          title: 'Bible translation',
          description: descriptionHtml,
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Verse memorization tour: opens a scripture **card**, saves with **Memorize** in the reader, opens **Menu** → **Memorize**,
 * highlights **+ Add** (picker without the reader), explains the list, opens practice from the **verse row** for a short preview (intro + round 1),
 * walks **Choose practice mode** with separate spotlights for **Type**, **Initials**, **Word**, and **Reorder**, then continues in **Type mode** for **Listen** and the read-aloud modal (play/pause, repeat, speed, close) when the control is shown, then continues with guided typing and closes, then removes the tour verse with the **trash** control (with confirm).
 *
 * When not on `/default`, stores resume state and navigates there first (`ProfilePageClient` calls `tryStartMemorizeTourAfterNavigation`).
 */

