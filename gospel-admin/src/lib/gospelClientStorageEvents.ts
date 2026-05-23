export const GOSPEL_CLIENT_STORAGE_HYDRATED_EVENT = 'gospel-client-storage-hydrated' as const

export function emitGospelClientStorageHydrated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_CLIENT_STORAGE_HYDRATED_EVENT))
}
