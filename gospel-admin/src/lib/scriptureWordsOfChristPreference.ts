import { gospelStorageSetSync } from '@/lib/gospelClientStorage'

export const SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY = 'gospel-scripture-show-words-of-christ'

const listeners = new Set<() => void>()
let storageListenerAdded = false

function notify() {
  listeners.forEach((l) => l())
}

function onStorage() {
  notify()
}

function addStorageListeners() {
  if (typeof window === 'undefined' || storageListenerAdded) return
  storageListenerAdded = true
  window.addEventListener('storage', onStorage)
}

function removeStorageListeners() {
  if (typeof window === 'undefined' || !storageListenerAdded) return
  storageListenerAdded = false
  window.removeEventListener('storage', onStorage)
}

export function readScriptureShowWordsOfChristFromStorage(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY)
    if (stored === 'false') return false
    if (stored === 'true') return true
  } catch {
    /* ignore */
  }
  return true
}

export function writeScriptureShowWordsOfChristToStorage(show: boolean): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageSetSync(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY, show ? 'true' : 'false')
    notify()
  } catch {
    /* ignore */
  }
}

export function subscribeScriptureShowWordsOfChrist(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  addStorageListeners()
  return () => {
    listeners.delete(onStoreChange)
    if (listeners.size === 0) removeStorageListeners()
  }
}
