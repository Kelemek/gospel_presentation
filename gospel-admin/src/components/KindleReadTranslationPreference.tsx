'use client'

import { useEffect } from 'react'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import {
  GOSPEL_PREFERRED_TRANSLATION_KEY,
  syncKindleReadTranslationPreference,
} from '@/lib/kindleReadTranslationPreference'

/**
 * When JavaScript is available, mirror translation among URL, cookie, and
 * localStorage (same key as the main app). Translation picks use plain links.
 */
export default function KindleReadTranslationPreference() {
  useEffect(() => {
    syncKindleReadTranslationPreference((code) => {
      gospelStorageSetSync(GOSPEL_PREFERRED_TRANSLATION_KEY, code)
    })
  }, [])

  return null
}
