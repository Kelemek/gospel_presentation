/** True for Amazon Kindle / Silk experimental browser user agents (e-ink devices). */
export function isKindleUserAgent(userAgent: string): boolean {
  return /Kindle|Silk/i.test(userAgent)
}

/** Client-side Kindle / Silk browser check (SSR-safe). */
export function isKindleBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return isKindleUserAgent(navigator.userAgent)
}
