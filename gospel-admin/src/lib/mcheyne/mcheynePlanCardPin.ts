import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'

/** True when scripture was opened from an M'Cheyne plan card (explicit section anchors). */
export function isMcheynePlanScriptureCardOpen(
  profileSlug: string,
  anchorSectionId: string | undefined,
  anchorSubsectionId: string | undefined
): boolean {
  if (!isMcheyneProfileSlug(profileSlug)) return false
  const sectionId = anchorSectionId?.trim() ?? ''
  const subsectionId = anchorSubsectionId?.trim() ?? ''
  if (!sectionId || !subsectionId) return false
  if (sectionId === 'modal-view' || subsectionId === 'modal-view') return false
  return true
}

/**
 * Whether the scripture modal should advance the M'Cheyne yellow resume pin.
 * On `mchy`, tracking starts from a plan card and stays on through profile-card
 * prev/next and Listen auto-advance until the user opens the passage picker or
 * Bible Reader (picker navigation does not resume tracking).
 */
export function shouldUpdateMcheyneReadingProgress(
  profileSlug: string,
  mcheyneReadingProgressActive: boolean | undefined
): boolean {
  if (!isMcheyneProfileSlug(profileSlug)) return true
  return mcheyneReadingProgressActive === true
}
