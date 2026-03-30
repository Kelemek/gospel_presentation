/**
 * Combine `/api/scripture` JSON error fields for user-visible messages.
 * Many failures use a generic `error` plus the real reason in `details`.
 */
export function formatScriptureApiError(data: {
  error?: string
  details?: unknown
}): string {
  const err = typeof data.error === 'string' ? data.error : ''
  const det = typeof data.details === 'string' ? data.details : ''
  if (!err && !det) return ''
  if (
    (err === 'Failed to fetch scripture text' || err === 'Database error occurred') &&
    det
  ) {
    return det
  }
  if (det && err) return `${err}: ${det}`
  return err || det
}
