import type { BibleTranslation } from '@/lib/bible-translations'

/**
 * @param enabledTranslationCodes — `null` means show all (e.g. while enabled list is still loading).
 */
export function isAttributionVisibleForTranslation(
  code: BibleTranslation,
  enabledTranslationCodes: readonly string[] | null
): boolean {
  if (enabledTranslationCodes === null) return true
  return enabledTranslationCodes.some((c) => c.toLowerCase() === code)
}
