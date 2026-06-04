/** Normalize profile timestamps for cache vs /modified comparison. */
export function profileUpdatedAtMs(value: string | Date | undefined | null): number | null {
  if (value == null || value === '') return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function profileUpdatedAtMatches(
  cachedUpdatedAt: string | undefined | null,
  serverUpdatedAt: string | undefined | null
): boolean {
  const cachedMs = profileUpdatedAtMs(cachedUpdatedAt)
  const serverMs = profileUpdatedAtMs(serverUpdatedAt)
  if (cachedMs == null || serverMs == null) return false
  return cachedMs === serverMs
}

/** Server is slightly newer than cache (typical when visit tracking still bumps updated_at). */
export function isLikelyVisitOnlyTimestampBump(
  cachedUpdatedAt: string | undefined | null,
  serverUpdatedAt: string | undefined | null,
  graceMs = 15_000
): boolean {
  const cachedMs = profileUpdatedAtMs(cachedUpdatedAt)
  const serverMs = profileUpdatedAtMs(serverUpdatedAt)
  if (cachedMs == null || serverMs == null) return false
  const delta = serverMs - cachedMs
  return delta > 0 && delta <= graceMs
}
