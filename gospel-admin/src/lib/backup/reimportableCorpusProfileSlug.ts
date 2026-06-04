import { isCalvinCommentaryProfileSlug } from '@/lib/calvin/calvinSlug'
import { isEdwardsSermonProfileSlug } from '@/lib/edwards/edwardsSlug'
import { isHenryCommentaryProfileSlug } from '@/lib/henry/henrySlug'
import {
  isDeprecatedLutherGalatiansSlug,
  isLutherGalatiansProfileSlug,
} from '@/lib/luther/lutherSlug'
import { isAllOfGraceProfileSlug } from '@/lib/allOfGrace/allOfGraceSlug'
import { isBerkhofSystematicTheologyProfileSlug } from '@/lib/berkhof/berkhofSlug'
import { isPilgrimProgressProfileSlug } from '@/lib/pilgrim/pilgrimSlug'
import { isWatsonBookProfileSlug } from '@/lib/watson/watsonSlug'
import { isMorneveProfileSlug } from '@/lib/spurgeon/morneveSlug'
import { isSpurgeonSermonProfileSlug } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'

/**
 * CCEL corpora and other bulk imports that can be rebuilt from npm import scripts.
 * Excluded from automated/manual DB backups to save space; disaster recovery = re-import.
 * Edge functions duplicate this logic inline in index.ts (Dashboard deploy bundles index only).
 */
export function isReimportableCorpusProfileSlug(slug: string): boolean {
  const s = slug.trim()
  return (
    isSpurgeonSermonProfileSlug(s) ||
    isMorneveProfileSlug(s) ||
    isCalvinCommentaryProfileSlug(s) ||
    isHenryCommentaryProfileSlug(s) ||
    isEdwardsSermonProfileSlug(s) ||
    isLutherGalatiansProfileSlug(s) ||
    isDeprecatedLutherGalatiansSlug(s) ||
    isPilgrimProgressProfileSlug(s) ||
    isAllOfGraceProfileSlug(s) ||
    isBerkhofSystematicTheologyProfileSlug(s) ||
    isWatsonBookProfileSlug(s)
  )
}
