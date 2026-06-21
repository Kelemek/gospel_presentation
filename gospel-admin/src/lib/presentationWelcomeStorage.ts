import { gospelStorageSetSync } from '@/lib/gospelClientStorage'

/** Set when the reader dismisses the first-visit welcome or starts the full walkthrough from it. */
export const PRESENTATION_FIRST_VISIT_WELCOME_KEY = 'gospel-presentation-first-visit-welcome-v1'

export function hasPresentationWelcomeBeenDismissed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY) === '1'
  } catch {
    return true
  }
}

export function dismissPresentationWelcome(): void {
  try {
    gospelStorageSetSync(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}
