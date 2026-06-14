import posthog from 'posthog-js'
import { getPostHogProjectKey } from '@/lib/posthog-config'

/** `modal` property values for the `modal_opened` event. */
export type ModalAnalyticsName =
  | 'scripture'
  | 'study'
  | 'coma'
  | 'four_rules'
  | 'memorize_practice'
  | 'memorize_add_bible_books'
  | 'bible_passage_picker'
  | 'scripture_word_study'
  | 'mcheyne_reading_plan'
  | 'morneve_devotions'
  | 'github_feedback'
  | 'site_changelog'
  | 'presentation_welcome'
  | 'memorize_listen_controls'

export type ModalOpenedProperties = {
  modal: ModalAnalyticsName
  profile_slug?: string
  reference?: string
  library_focus?: 'all' | 'spurgeon' | 'calvin' | 'henry' | 'edwards'
  variant?: 'memorize' | 'reader'
  memorization_kind?: 'verse' | 'bible_books'
}

export type PostHogEventProperties = Record<
  string,
  string | number | boolean | undefined
>

/** Client-side custom event capture; no-op when PostHog is not configured or loaded. */
export function capturePostHogEvent(
  event: string,
  properties?: PostHogEventProperties
): void {
  if (!getPostHogProjectKey()) return
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}

export function captureModalOpened(
  properties: Omit<ModalOpenedProperties, 'modal'> & { modal: ModalAnalyticsName }
): void {
  const payload: PostHogEventProperties = { modal: properties.modal }
  if (properties.profile_slug !== undefined) {
    payload.profile_slug = properties.profile_slug
  }
  if (properties.reference !== undefined) {
    payload.reference = properties.reference
  }
  if (properties.library_focus !== undefined) {
    payload.library_focus = properties.library_focus
  }
  if (properties.variant !== undefined) {
    payload.variant = properties.variant
  }
  if (properties.memorization_kind !== undefined) {
    payload.memorization_kind = properties.memorization_kind
  }
  capturePostHogEvent('modal_opened', payload)
}
