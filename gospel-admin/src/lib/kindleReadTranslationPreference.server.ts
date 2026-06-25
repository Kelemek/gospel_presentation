import 'server-only'

import { cookies } from 'next/headers'
import type { BibleTranslation } from '@/lib/bible-translations'
import {
  GOSPEL_PREFERRED_TRANSLATION_COOKIE,
  resolveKindleReadTranslation,
} from '@/lib/kindleReadTranslationPreference'

export async function getKindleReadTranslationFromCookies(
  enabledCodes: readonly string[]
): Promise<BibleTranslation> {
  const cookieStore = await cookies()
  return resolveKindleReadTranslation(
    cookieStore.get(GOSPEL_PREFERRED_TRANSLATION_COOKIE)?.value,
    enabledCodes
  )
}

/**
 * Resolve translation from `?translation=` (Kindle Menu links) or cookie.
 * Cookie is set in `proxy.ts` when the query param is present (not in RSC).
 */
export async function resolveKindleReadTranslationForRequest(
  queryTranslation: string | null | undefined,
  enabledCodes: readonly string[]
): Promise<BibleTranslation> {
  const trimmed = queryTranslation?.trim()
  if (trimmed) {
    return resolveKindleReadTranslation(trimmed, enabledCodes)
  }

  return getKindleReadTranslationFromCookies(enabledCodes)
}
