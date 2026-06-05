/**
 * Normalize and validate external resource URLs for subsection link cards.
 */

export function normalizeExternalResourceUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let candidate = trimmed
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}

export function isValidExternalResourceUrl(url: string): boolean {
  return normalizeExternalResourceUrl(url) !== null
}
