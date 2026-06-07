/** True when spurgeon-links payload includes indexed corpora or cross references. */
export function studyResourcesAvailableFromPayload(payload: {
  items?: unknown
  sermonCount?: number
  edwardsCount?: number
  morneveCount?: number
  calvinCount?: number
  henryCount?: number
  bookCount?: number
  crossRefCount?: number
}): boolean {
  const crossRefCount = typeof payload.crossRefCount === 'number' ? payload.crossRefCount : 0
  if (crossRefCount > 0) return true

  const sermonCount =
    typeof payload.sermonCount === 'number'
      ? payload.sermonCount
      : Array.isArray(payload.items)
        ? payload.items.length
        : 0
  const edwardsCount = typeof payload.edwardsCount === 'number' ? payload.edwardsCount : 0
  const morneveCount = typeof payload.morneveCount === 'number' ? payload.morneveCount : 0
  const calvinCount = typeof payload.calvinCount === 'number' ? payload.calvinCount : 0
  const henryCount = typeof payload.henryCount === 'number' ? payload.henryCount : 0
  const bookCount = typeof payload.bookCount === 'number' ? payload.bookCount : 0

  return sermonCount + edwardsCount + morneveCount + calvinCount + henryCount + bookCount > 0
}
