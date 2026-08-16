'use client'

import { useSyncExternalStore } from 'react'

/** True after the client has mounted (false during SSR). */
export function useClientHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
