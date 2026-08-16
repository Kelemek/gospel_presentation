import type { GospelSection } from '@/lib/types'
import { logger } from '@/lib/logger'

/** Favorite scripture reference strings in profile order (subsection cards with `favorite: true`). */
export function buildProfileFavoriteScriptureReferences(sections: GospelSection[] | undefined): string[] {
  if (!sections) return []
  const favorites: string[] = []
  sections.forEach((section) => {
    section.subsections.forEach((subsection) => {
      if (subsection.scriptureReferences) {
        subsection.scriptureReferences.forEach((ref) => {
          if (ref.favorite) favorites.push(ref.reference)
        })
      }
      if (subsection.nestedSubsections) {
        subsection.nestedSubsections.forEach((nested) => {
          if (nested.scriptureReferences) {
            nested.scriptureReferences.forEach((ref) => {
              if (ref.favorite) favorites.push(ref.reference)
            })
          }
        })
      }
    })
  })
  logger.debug('📖 Found', favorites.length, 'favorite scripture references:', favorites)
  return favorites
}
