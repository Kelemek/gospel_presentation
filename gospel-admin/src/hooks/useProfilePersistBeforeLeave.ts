'use client'

import { useCallback, useRef } from 'react'

export type PersistBeforeLeaveReason = string | undefined

/** Registers a single “persist reading resume before leave” handler for cross-hook coordination. */
export function useProfilePersistBeforeLeave() {
  const handlerRef = useRef<(reason?: PersistBeforeLeaveReason) => void>(() => {})

  const registerPersistBeforeLeave = useCallback((handler: (reason?: PersistBeforeLeaveReason) => void) => {
    handlerRef.current = handler
  }, [])

  const persistReadingResumeBeforeLeave = useCallback((reason?: PersistBeforeLeaveReason) => {
    handlerRef.current(reason)
  }, [])

  return {
    registerPersistBeforeLeave,
    persistReadingResumeBeforeLeave,
  }
}
