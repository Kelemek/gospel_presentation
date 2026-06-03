import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { deleteGospelIdbForTests } from '@/lib/gospelClientKvStore'

/** Clears gospel in-memory cache, hydration state, and IndexedDB between tests. */
export async function resetGospelStorageTestState(): Promise<void> {
  resetGospelClientStorageForTests()
  await deleteGospelIdbForTests()
}

/** In-memory Storage for tests (Jest setup mocks `localStorage` / `sessionStorage` with jest.fn()). */
export function createTestStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map<string, string>(Object.entries(initial))
  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
    removeItem(key: string) {
      data.delete(key)
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
  } as Storage
}

/** @deprecated Prefer `createTestStorage` — name kept for existing imports. */
export const createTestLocalStorage = createTestStorage

function installStorageOnGlobal(
  storage: Storage,
  property: 'localStorage' | 'sessionStorage'
): Storage {
  Object.defineProperty(global, property, {
    value: storage,
    configurable: true,
    writable: true,
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, property, {
      value: storage,
      configurable: true,
      writable: true,
    })
  }
  return storage
}

export function installTestLocalStorage(initial?: Record<string, string>): Storage {
  return installStorageOnGlobal(createTestStorage(initial), 'localStorage')
}

export function installTestSessionStorage(initial?: Record<string, string>): Storage {
  return installStorageOnGlobal(createTestStorage(initial), 'sessionStorage')
}

/** Replace both Jest storage mocks with in-memory implementations. */
export function installTestBrowserStorage(initial?: {
  local?: Record<string, string>
  session?: Record<string, string>
}): { localStorage: Storage; sessionStorage: Storage } {
  return {
    localStorage: installTestLocalStorage(initial?.local),
    sessionStorage: installTestSessionStorage(initial?.session),
  }
}
