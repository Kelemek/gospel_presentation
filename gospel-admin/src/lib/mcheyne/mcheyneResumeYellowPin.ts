import { hydrateVersePinsFromStorage, loadVersePins, type VersePinSlotEntry } from '@/lib/versePinStorage'
import { MCHEYNE_SLUG } from '@/lib/mcheyne/mcheyneSlug'

/** Yellow “last passage” pin for the M'Cheyne template (always stored under `mchy`). */
export async function loadMcheyneYellowPinForResume(): Promise<VersePinSlotEntry | null> {
  await hydrateVersePinsFromStorage(MCHEYNE_SLUG)
  const yellow = loadVersePins(MCHEYNE_SLUG).yellow
  if (!yellow?.subsectionId) return null
  return yellow
}
