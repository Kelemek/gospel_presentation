'use client'

import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import {
  CAPACITOR_DEPLOY_CHECK_INTERVAL_MS,
  fetchAppDeployVersion,
  getStoredCapacitorDeployVersion,
  isCapacitorDeployVersionStale,
  isLikelyStaleChunkLoadError,
  messageFromUnknownError,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'
import {
  CAPACITOR_RESTART_APP_NOTICE,
  markCapacitorDeployNoticeShown,
  shouldShowCapacitorDeployNotice,
} from '@/lib/capacitorDeployNotice'

const subscribeClientMounted = () => () => {}

/**
 * On Capacitor native, detects a new server deploy (or stale chunk errors) and
 * politely asks the user to close and reopen the app — no automatic reload.
 */
export function CapacitorDeployNoticeController() {
  const { showAlert } = useAlertModal()
  const clientMounted = useSyncExternalStore(
    subscribeClientMounted,
    () => true,
    () => false
  )
  const noticePendingRef = useRef(false)
  /** Fallback when sessionStorage is unavailable (private mode / quota). */
  const inMemoryDeployVersionRef = useRef<string | null>(null)

  const baselineDeployVersion = useCallback(
    () => getStoredCapacitorDeployVersion() ?? inMemoryDeployVersionRef.current,
    []
  )

  const rememberDeployVersion = useCallback((version: string) => {
    inMemoryDeployVersionRef.current = version
    setStoredCapacitorDeployVersion(version)
  }, [])

  const promptRestartIfNeeded = useCallback(
    (remoteVersion: string | null) => {
      if (!remoteVersion || noticePendingRef.current) return
      if (!shouldShowCapacitorDeployNotice(remoteVersion)) return

      noticePendingRef.current = true
      markCapacitorDeployNoticeShown(remoteVersion)
      showAlert(CAPACITOR_RESTART_APP_NOTICE)
      noticePendingRef.current = false
    },
    [showAlert]
  )

  const checkForDeployUpdate = useCallback(async () => {
    const remoteVersion = await fetchAppDeployVersion()
    if (!remoteVersion) return

    const baselineVersion = baselineDeployVersion()
    if (!baselineVersion) {
      rememberDeployVersion(remoteVersion)
      return
    }

    if (isCapacitorDeployVersionStale(baselineVersion, remoteVersion)) {
      promptRestartIfNeeded(remoteVersion)
    }
  }, [baselineDeployVersion, rememberDeployVersion, promptRestartIfNeeded])

  useEffect(() => {
    if (!clientMounted || !Capacitor.isNativePlatform()) return

    const initialCheckId = window.setTimeout(() => {
      void checkForDeployUpdate()
    }, 0)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForDeployUpdate()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const onWindowFocus = () => {
      void checkForDeployUpdate()
    }
    window.addEventListener('focus', onWindowFocus)

    const onOnline = () => {
      void checkForDeployUpdate()
    }
    window.addEventListener('online', onOnline)

    const intervalId = window.setInterval(() => {
      void checkForDeployUpdate()
    }, CAPACITOR_DEPLOY_CHECK_INTERVAL_MS)

    const onStaleChunkError = () => {
      void fetchAppDeployVersion().then((remoteVersion) => {
        promptRestartIfNeeded(remoteVersion ?? 'stale-chunk')
      })
    }

    const onWindowError = (event: ErrorEvent) => {
      if (isLikelyStaleChunkLoadError(event.message ?? '')) {
        onStaleChunkError()
      }
    }
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isLikelyStaleChunkLoadError(messageFromUnknownError(event.reason))) {
        onStaleChunkError()
      }
    }
    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.clearTimeout(initialCheckId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('online', onOnline)
      window.clearInterval(intervalId)
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [clientMounted, checkForDeployUpdate, promptRestartIfNeeded])

  return null
}
