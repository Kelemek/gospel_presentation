import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'

export const MEMORIZATION_STRICT_MODE_STORAGE_KEY = 'gospel-admin:memorization-strict-mode'

export const GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT =
  'gospel-memorization-strict-mode-changed'

export function normalizeMemorizationStrictMode(raw: string | null): boolean {
  return raw === 'true'
}

export function readMemorizationStrictModeFromStorage(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return normalizeMemorizationStrictMode(
      gospelStorageGetSync(MEMORIZATION_STRICT_MODE_STORAGE_KEY)
    )
  } catch {
    return false
  }
}

export function writeMemorizationStrictModeToStorage(strict: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    gospelStorageSetSync(MEMORIZATION_STRICT_MODE_STORAGE_KEY, strict ? 'true' : 'false')
    window.dispatchEvent(
      new CustomEvent(GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT, { detail: { strict } })
    )
  } catch {
    // ignore
  }
}
