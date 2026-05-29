'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

type PassageAnchorStore = {
  anchored: string | null
  listeners: Set<() => void>
}

/**
 * Remembers the last passage content key that finished loading while the modal is open.
 * Used to distinguish first open (outer spinner) from reload (keep swipe layer mounted).
 */
export function usePassageAnchorKey(
  isOpen: boolean,
  contentReady: boolean,
  contentKey: string
): string | null {
  const storeRef = useRef<PassageAnchorStore>({
    anchored: null,
    listeners: new Set(),
  })

  const subscribe = useCallback((onStoreChange: () => void) => {
    const store = storeRef.current
    store.listeners.add(onStoreChange)
    return () => {
      store.listeners.delete(onStoreChange)
    }
  }, [])

  const getSnapshot = useCallback(() => storeRef.current.anchored, [])

  const anchoredPassageKey = useSyncExternalStore(subscribe, getSnapshot, () => null)

  useEffect(() => {
    const store = storeRef.current
    let next: string | null
    if (!isOpen) {
      next = null
    } else if (contentReady) {
      next = contentKey
    } else {
      return
    }

    if (store.anchored === next) return
    store.anchored = next
    store.listeners.forEach((listener) => listener())
  }, [isOpen, contentReady, contentKey])

  return anchoredPassageKey
}
