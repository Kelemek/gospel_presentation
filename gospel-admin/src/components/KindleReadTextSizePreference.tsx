'use client'

import { useEffect } from 'react'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import {
  GOSPEL_PROFILE_TEXT_SIZE_KEY,
  syncKindleReadTextSizePreference,
} from '@/lib/kindleReadTextSizePreference'

/**
 * When JavaScript is available, mirror text size among URL, cookie, and
 * localStorage (same key as the main app). Text size picks use plain links.
 */
export default function KindleReadTextSizePreference() {
  useEffect(() => {
    syncKindleReadTextSizePreference((size) => {
      gospelStorageSetSync(GOSPEL_PROFILE_TEXT_SIZE_KEY, size)
    })
  }, [])

  return null
}
