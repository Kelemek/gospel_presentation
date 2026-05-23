const IDB_NAME = 'gospel-presentation'
const IDB_STORE = 'kv'
const IDB_VERSION = 1

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
  })
}

export async function idbGetItem(key: string): Promise<string | null> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const request = store.get(key)
    request.onerror = () => reject(request.error ?? new Error('indexedDB get failed'))
    request.onsuccess = () => {
      const value = request.result
      resolve(typeof value === 'string' ? value : null)
    }
    tx.oncomplete = () => db.close()
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('indexedDB transaction failed'))
    }
  })
}

export async function idbSetItem(key: string, value: string): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    store.put(value, key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('indexedDB transaction failed'))
    }
  })
}

export async function idbListKeys(): Promise<string[]> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const request = store.getAllKeys()
    request.onerror = () => reject(request.error ?? new Error('indexedDB getAllKeys failed'))
    request.onsuccess = () => {
      const raw = request.result
      const keys = Array.isArray(raw)
        ? raw.filter((k): k is string => typeof k === 'string')
        : []
      resolve(keys)
    }
    tx.oncomplete = () => db.close()
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('indexedDB transaction failed'))
    }
  })
}

export async function idbRemoveItem(key: string): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    store.delete(key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('indexedDB transaction failed'))
    }
  })
}

export async function isIndexedDbWritable(): Promise<boolean> {
  const probe = '__gospel_idb_write_probe__'
  try {
    await idbSetItem(probe, '1')
    await idbRemoveItem(probe)
    return true
  } catch {
    return false
  }
}

/** Test-only: drop the gospel IDB so async reads do not leak between Jest cases. */
export function deleteGospelIdbForTests(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const request = indexedDB.deleteDatabase(IDB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}
