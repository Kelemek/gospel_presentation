'use client'

import { useEffect, useRef } from 'react'
import {
  GOSPEL_SYNC_FLUSH_REQUEST_EVENT,
  GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT,
  SYNC_PULL_INTERVAL_MS,
  SYNC_PUSH_DEBOUNCE_MS,
} from '@/lib/gospelDeviceSync/constants'
import {
  getDirtyKeys,
  isDeviceSyncActive,
  emitDeviceSyncStateChanged,
  readSyncKeyBase64,
} from '@/lib/gospelDeviceSync/dirty'
import {
  pullChangedKeys,
  pushDirtyKeys,
} from '@/lib/gospelDeviceSync/client'
import {
  deriveStorageId,
} from '@/lib/gospelDeviceSync/crypto'

/** Background push/pull for login-free device sync. */
export function GospelDeviceSyncEngine() {
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPullRef = useRef(0)
  const runningPushRef = useRef(false)
  const runningPullRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const runPush = async () => {
      if (!isDeviceSyncActive() || runningPushRef.current) return
      const syncKey = readSyncKeyBase64()
      if (!syncKey) return
      runningPushRef.current = true
      try {
        const storageId = await deriveStorageId(syncKey)
        await pushDirtyKeys(syncKey, storageId)
      } catch {
        /* network errors are retried on next debounce or flush */
      } finally {
        runningPushRef.current = false
      }
    }

    const schedulePush = () => {
      if (!isDeviceSyncActive()) return
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
      }
      pushTimerRef.current = setTimeout(() => {
        pushTimerRef.current = null
        void runPush()
      }, SYNC_PUSH_DEBOUNCE_MS)
    }

    const flushPush = () => {
      if (!isDeviceSyncActive()) return
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
      void runPush()
    }

    const runPull = async (force = false) => {
      if (!isDeviceSyncActive() || runningPullRef.current) return
      const now = Date.now()
      if (!force && now - lastPullRef.current < SYNC_PULL_INTERVAL_MS) return
      const syncKey = readSyncKeyBase64()
      if (!syncKey) return
      runningPullRef.current = true
      try {
        const storageId = await deriveStorageId(syncKey)
        const changed = await pullChangedKeys(syncKey, storageId)
        lastPullRef.current = Date.now()
        if (changed) {
          emitDeviceSyncStateChanged()
        }
      } catch {
        /* retry on next focus/interval */
      } finally {
        runningPullRef.current = false
      }
    }

    const onFocus = () => {
      void runPull(true)
    }

    const onStorageWrite = () => {
      schedulePush()
    }

    const scheduleFlushPush = () => {
      // Defer so profile reading-resume saves (registered later) run first on hide.
      queueMicrotask(() => {
        flushPush()
      })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runPull(true)
      } else if (document.visibilityState === 'hidden') {
        scheduleFlushPush()
      }
    }

    const onPageHide = () => {
      scheduleFlushPush()
    }

    const onFlushRequest = () => {
      flushPush()
    }

    const emitStartupPullDone = () => {
      window.dispatchEvent(new CustomEvent(GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT))
    }

    const onWindowBlur = () => {
      scheduleFlushPush()
    }

    const pullInterval = setInterval(() => {
      void runPull(false)
    }, SYNC_PULL_INTERVAL_MS)

    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('gospel-sync-dirty', onStorageWrite)
    window.addEventListener(GOSPEL_SYNC_FLUSH_REQUEST_EVENT, onFlushRequest)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    void (async () => {
      if (isDeviceSyncActive()) {
        await runPull(true)
      }
      emitStartupPullDone()
      if (getDirtyKeys().length > 0) {
        await runPush()
      }
    })()

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      clearInterval(pullInterval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('gospel-sync-dirty', onStorageWrite)
      window.removeEventListener(GOSPEL_SYNC_FLUSH_REQUEST_EVENT, onFlushRequest)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return null
}
