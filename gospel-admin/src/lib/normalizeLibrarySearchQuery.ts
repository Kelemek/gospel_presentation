/** Strip characters unsafe for ILIKE / RPC search (matches sermon library APIs). */
export function normalizeLibrarySearchQuery(raw: string): string | null {
  const stripped = raw
    .trim()
    .replace(/%/g, '')
    .replace(/_/g, '')
    .replace(/,/g, '')
    .replace(/"/g, '')
    .trim()
  return stripped.length > 0 ? stripped : null
}
