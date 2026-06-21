export const GOSPEL_CLIENT_STORAGE_HYDRATED_EVENT = 'gospel-client-storage-hydrated' as const

/** Fired after a gospel storage key is written or removed (including remote sync pull). */
export const GOSPEL_CLIENT_STORAGE_CHANGED_EVENT = 'gospel-client-storage-changed' as const

export type GospelClientStorageChangedDetail = { key: string }

export function emitGospelClientStorageHydrated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_CLIENT_STORAGE_HYDRATED_EVENT))
}

export function emitGospelClientStorageChanged(key: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<GospelClientStorageChangedDetail>(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, {
      detail: { key },
    })
  )
}
