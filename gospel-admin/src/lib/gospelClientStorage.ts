import { idbGetItem, idbRemoveItem, idbSetItem } from '@/lib/gospelClientKvStore'
import { shouldUseIndexedDb } from '@/lib/gospelClientStoragePolicy'
import { emitGospelClientStorageHydrated } from '@/lib/gospelClientStorageEvents'

const memoryCache = new Map<string, string>()
/** Per-key chains so read-modify-write callers do not clobber each other. */
const mutateChains = new Map<string, Promise<boolean>>()
let hydratePromise: Promise<void> | null = null
let hydrated = false

function readAllLocalStorageKeys(): string[] {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)
      if (k) keys.push(k)
    }
  } catch {
    /* ignore */
  }
  return keys
}

function tryRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* keep LS copy if remove fails */
  }
}

function tryGetLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function trySetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * One-time (idempotent) migration: large keys in localStorage → IndexedDB, then remove LS copy on success.
 * Safe to call multiple times; warms the in-memory cache for sync reads.
 */
export async function hydrateGospelClientStorage(): Promise<void> {
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    if (typeof window === 'undefined') {
      hydrated = true
      return
    }

    for (const key of readAllLocalStorageKeys()) {
      if (!shouldUseIndexedDb(key)) continue
      const lsValue = tryGetLocalStorage(key)
      if (!lsValue) continue

      try {
        const idbValue = await idbGetItem(key)
        if (idbValue != null) {
          memoryCache.set(key, idbValue)
          tryRemoveLocalStorage(key)
        } else {
          await idbSetItem(key, lsValue)
          memoryCache.set(key, lsValue)
          tryRemoveLocalStorage(key)
        }
      } catch {
        memoryCache.set(key, lsValue)
      }
    }

    hydrated = true
    emitGospelClientStorageHydrated()
  })()

  return hydratePromise
}

export function isGospelClientStorageHydrated(): boolean {
  return hydrated
}

/** Values written to IndexedDB-backed keys (for backup export). */
export function getGospelClientStorageMemoryEntries(): ReadonlyMap<string, string> {
  return memoryCache
}

export function gospelStorageGetSync(key: string): string | null {
  if (typeof window === 'undefined') return null
  if (shouldUseIndexedDb(key)) {
    if (memoryCache.has(key)) return memoryCache.get(key) ?? null
    const ls = tryGetLocalStorage(key)
    if (ls != null) memoryCache.set(key, ls)
    return ls
  }
  return tryGetLocalStorage(key)
}

export async function gospelStorageGet(key: string): Promise<string | null> {
  await hydrateGospelClientStorage()
  if (!shouldUseIndexedDb(key)) {
    return gospelStorageGetSync(key)
  }
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null
  try {
    const idbValue = await idbGetItem(key)
    if (idbValue != null) {
      memoryCache.set(key, idbValue)
      return idbValue
    }
  } catch {
    /* fall through */
  }
  return gospelStorageGetSync(key)
}

/**
 * Updates the in-memory read cache immediately. For IndexedDB-backed keys the durable
 * write runs in the background — the return value is **not** a persistence guarantee.
 * Use `gospelStorageSet` when you need to know whether storage accepted the write.
 */
export function gospelStorageSetSync(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  if (shouldUseIndexedDb(key)) {
    memoryCache.set(key, value)
    void idbSetItem(key, value)
      .then(() => tryRemoveLocalStorage(key))
      .catch(() => {
        trySetLocalStorage(key, value)
      })
    return true
  }
  return trySetLocalStorage(key, value)
}

export async function gospelStorageSet(key: string, value: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!shouldUseIndexedDb(key)) {
    return trySetLocalStorage(key, value)
  }
  memoryCache.set(key, value)
  try {
    await idbSetItem(key, value)
    tryRemoveLocalStorage(key)
    return true
  } catch {
    trySetLocalStorage(key, value)
    return false
  }
}

/**
 * Serialized read-modify-write for a storage key. Concurrent mutators for the same key
 * run in order so each sees the previous writer's result.
 */
export async function gospelStorageMutate(
  key: string,
  mutator: (current: string | null) => string | Promise<string>
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const prior = mutateChains.get(key) ?? Promise.resolve(true)
  const operation = prior.catch(() => true).then(async (): Promise<boolean> => {
    await hydrateGospelClientStorage()
    const current = gospelStorageGetSync(key)
    const next = await mutator(current)
    return gospelStorageSet(key, next)
  })

  mutateChains.set(key, operation)
  return operation
}

export async function gospelStorageRemove(key: string): Promise<void> {
  memoryCache.delete(key)
  if (shouldUseIndexedDb(key)) {
    try {
      await idbRemoveItem(key)
    } catch {
      /* ignore */
    }
  }
  tryRemoveLocalStorage(key)
}

export function gospelStorageRemoveSync(key: string): void {
  memoryCache.delete(key)
  if (shouldUseIndexedDb(key)) {
    void idbRemoveItem(key).catch(() => {})
  }
  tryRemoveLocalStorage(key)
}

/** @deprecated Use `hydrateGospelClientStorage`. */
export function hydrateMemorizedVersesStorage(): Promise<void> {
  return hydrateGospelClientStorage()
}

/** Test-only: reset hydration state between Jest cases. */
export function resetGospelClientStorageForTests(): void {
  memoryCache.clear()
  mutateChains.clear()
  hydratePromise = null
  hydrated = false
}
