import { isCalvinCommentaryProfileSlug } from '@/lib/calvin/calvinSlug'
import { isEdwardsSermonProfileSlug } from '@/lib/edwards/edwardsSlug'
import { isHenryCommentaryProfileSlug } from '@/lib/henry/henrySlug'
import { isMorneveProfileSlug } from '@/lib/spurgeon/morneveSlug'
import { isSpurgeonSermonProfileSlug } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'

/** Spurgeon / Edwards / Morneve / Calvin / Henry corpora (dedicated library modals and APIs). */
export function isStudyLibraryCorpusProfileSlug(slug: string): boolean {
  const s = slug.trim()
  return (
    isSpurgeonSermonProfileSlug(s) ||
    isEdwardsSermonProfileSlug(s) ||
    isMorneveProfileSlug(s) ||
    isCalvinCommentaryProfileSlug(s) ||
    isHenryCommentaryProfileSlug(s)
  )
}
