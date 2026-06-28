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

function normalizeSectionTitleForPin(title: string): string {
  return title.trim().toLowerCase()
}

/** Keep pinned titles first (in listed order), then sort remaining sections A→Z. */
export function sortGospelSectionsWithPinnedFirst(
  gospelData: GospelSection[],
  pinnedTitles: string[]
): void {
  const pinnedOrder = pinnedTitles.map((t) => normalizeSectionTitleForPin(t)).filter(Boolean)
  const pinnedSet = new Set(pinnedOrder)

  const pinned: GospelSection[] = []
  const pinnedByKey = new Map<string, GospelSection>()
  const rest: GospelSection[] = []

  for (const section of gospelData) {
    const key = normalizeSectionTitleForPin(section.title || '')
    if (pinnedSet.has(key)) {
      pinnedByKey.set(key, section)
    } else {
      rest.push(section)
    }
  }

  for (const key of pinnedOrder) {
    const section = pinnedByKey.get(key)
    if (section) pinned.push(section)
  }

  rest.sort((a, b) =>
    (a.title || '').trim().localeCompare((b.title || '').trim(), undefined, { sensitivity: 'base' })
  )

  gospelData.length = 0
  gospelData.push(...pinned, ...rest)
  renumberGospelSections(gospelData)
}
