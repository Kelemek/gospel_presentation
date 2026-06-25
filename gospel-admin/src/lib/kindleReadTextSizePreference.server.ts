import 'server-only'

import { cookies } from 'next/headers'
import {
  GOSPEL_PROFILE_TEXT_SIZE_COOKIE,
  resolveKindleReadTextSize,
  type KindleReadTextSize,
} from '@/lib/kindleReadTextSizePreference'

export async function getKindleReadTextSizeFromCookies(): Promise<KindleReadTextSize> {
  const cookieStore = await cookies()
  return resolveKindleReadTextSize(cookieStore.get(GOSPEL_PROFILE_TEXT_SIZE_COOKIE)?.value)
}

/**
 * Resolve text size from `?textSize=` (Kindle Menu links) or cookie.
 * Cookie is set in `proxy.ts` when the query param is present (not in RSC).
 */
export async function resolveKindleReadTextSizeForRequest(
  queryTextSize: string | null | undefined
): Promise<KindleReadTextSize> {
  const trimmed = queryTextSize?.trim()
  if (trimmed) {
    return resolveKindleReadTextSize(trimmed)
  }

  return getKindleReadTextSizeFromCookies()
}
