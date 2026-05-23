import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { deleteGospelIdbForTests } from '@/lib/gospelClientKvStore'

/** Clears gospel in-memory cache, hydration state, and IndexedDB between tests. */
export async function resetGospelStorageTestState(): Promise<void> {
  resetGospelClientStorageForTests()
  await deleteGospelIdbForTests()
}

/** Real in-memory Storage for tests (Jest setup mocks `global.localStorage` with jest.fn()). */
export function createTestLocalStorage(initial: Record<string, string> = {}): Storage {
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

export function installTestLocalStorage(initial?: Record<string, string>): Storage {
  const storage = createTestLocalStorage(initial)
  Object.defineProperty(global, 'localStorage', { value: storage, configurable: true, writable: true })
  return storage
}
