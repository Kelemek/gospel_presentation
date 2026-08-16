'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT,
  isPresentationReadComplete,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
  removePresentationReadCompleteSlug,
} from '@/lib/presentationReadCompleteStorage'

export function useProfilePresentationReadStatus(profileSlug: string) {
  const presentationMarkedReadComplete = useSyncExternalStore(
    (onStoreChange) => {
      if (!profileSlug || typeof window === 'undefined') return () => {}
      const onStatus = (e: Event) => {
        const ce = e as CustomEvent<{ slug: string; read: boolean }>
        if (ce.detail?.slug === profileSlug) onStoreChange()
      }
      const onStorage = (ev: StorageEvent) => {
        if (ev.key === PRESENTATION_READ_COMPLETE_STORAGE_KEY) onStoreChange()
      }
      window.addEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
        window.removeEventListener('storage', onStorage)
      }
    },
    () => (profileSlug ? isPresentationReadComplete(profileSlug) : false),
    () => false
  )

  const handleMarkPresentationUnread = useCallback(() => {
    if (!profileSlug) return
    removePresentationReadCompleteSlug(profileSlug)
  }, [profileSlug])

  return {
    presentationMarkedReadComplete,
    handleMarkPresentationUnread,
  }
}
