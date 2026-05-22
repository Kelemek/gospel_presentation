import { isCalvinCommentaryProfileSlug } from '@/lib/calvin/calvinSlug'
import { isHenryCommentaryProfileSlug } from '@/lib/henry/henrySlug'
import { isEdwardsSermonProfileSlug } from '@/lib/edwards/edwardsSlug'
import { isDeprecatedLutherGalatiansSlug } from '@/lib/luther/lutherSlug'
import { isMorneveProfileSlug } from '@/lib/spurgeon/morneveSlug'
import { isSpurgeonSermonProfileSlug } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'

/** CCEL corpora use library rows or modals, not the generic template picker. */
export function isCcelCorpusProfileSlug(slug: string): boolean {
  return (
    isSpurgeonSermonProfileSlug(slug) ||
    isMorneveProfileSlug(slug) ||
    isCalvinCommentaryProfileSlug(slug) ||
    isHenryCommentaryProfileSlug(slug) ||
    isEdwardsSermonProfileSlug(slug)
  )
}

/** Public templates that admins can add via "Add template to list" / category pickers. */
export function isResourcesMenuPickableTemplateSlug(slug: string): boolean {
  if (isDeprecatedLutherGalatiansSlug(slug)) return false
  return !isCcelCorpusProfileSlug(slug)
}

/** Label for template picker options; disambiguates duplicate titles. */
export function resourcesMenuTemplatePickerLabel(
  templates: { slug: string; title: string }[],
  t: { slug: string; title: string }
): string {
  const title = t.title || t.slug
  const sameTitle = templates.filter((x) => (x.title || x.slug) === title)
  if (sameTitle.length > 1) return `${title} (${t.slug})`
  return title
}
