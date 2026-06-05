import type { GospelSection } from '@/lib/types'

export function renumberGospelSections(gospelData: GospelSection[]): void {
  gospelData.forEach((section, index) => {
    section.section = String(index + 1)
  })
}

/** Sort top-level sections A→Z by title (case-insensitive) and renumber `section` fields. */
export function sortGospelSectionsAlphabetically(gospelData: GospelSection[]): void {
  gospelData.sort((a, b) =>
    (a.title || '').trim().localeCompare((b.title || '').trim(), undefined, { sensitivity: 'base' })
  )
  renumberGospelSections(gospelData)
}
