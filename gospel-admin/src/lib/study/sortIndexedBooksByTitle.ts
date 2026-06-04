export type IndexedBookProfileRow = { slug: string; title: string }

export function sortIndexedBooksByTitleAZ(
  profiles: IndexedBookProfileRow[]
): IndexedBookProfileRow[] {
  return [...profiles].sort((a, b) =>
    (a.title || a.slug).localeCompare(b.title || b.slug, undefined, { sensitivity: 'base' })
  )
}
