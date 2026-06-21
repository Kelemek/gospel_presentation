import { gospelStorageSetSync } from '@/lib/gospelClientStorage'

export const PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY =
  'gospel-admin:profile-read-along-underline-style'

export type ProfileReadAlongUnderlineStyle = 'word' | 'line'

export function readProfileReadAlongUnderlineStyleFromStorage(): ProfileReadAlongUnderlineStyle {
  if (typeof window === 'undefined') return 'word'
  try {
    const v = window.localStorage.getItem(PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY)
    if (v === 'line' || v === 'word') return v
  } catch {
    /* ignore */
  }
  return 'word'
}

export function writeProfileReadAlongUnderlineStyleToStorage(style: ProfileReadAlongUnderlineStyle): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageSetSync(PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY, style)
  } catch {
    /* ignore */
  }
}
