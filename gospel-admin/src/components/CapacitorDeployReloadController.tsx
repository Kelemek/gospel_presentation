'use client'

import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  CAPACITOR_DEPLOY_CHECK_INTERVAL_MS,
  fetchAppDeployVersion,
  getStoredCapacitorDeployVersion,
  isCapacitorDeployVersionStale,
  isLikelyStaleChunkLoadError,
  messageFromUnknownError,
  reloadCapacitorWebViewForDeploy,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'

const subscribeClientMounted = () => () => {}

/**
 * On Capacitor native, silently reloads the WebView when the server deploy changes.
 * - New deploy while the app is open: reload immediately (before navigation can fail).
 * - Stale chunk / runtime errors: reload immediately.
 */
export function CapacitorDeployReloadController() {
  const clientMounted = useSyncExternalStore(
    subscribeClientMounted,
    () => true,
    () => false
  )
  const reloadingRef = useRef(false)
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

  const reloadForDeploy = useCallback((remoteVersion: string | null) => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    if (remoteVersion) {
      reloadCapacitorWebViewForDeploy(remoteVersion)
      return
    }
    window.location.reload()
  }, [])

  const checkForDeployUpdate = useCallback(async () => {
    const remoteVersion = await fetchAppDeployVersion()
    if (!remoteVersion) return

    const baselineVersion = baselineDeployVersion()
    if (!baselineVersion) {
      rememberDeployVersion(remoteVersion)
      return
    }

    if (isCapacitorDeployVersionStale(baselineVersion, remoteVersion)) {
      reloadForDeploy(remoteVersion)
    }
  }, [baselineDeployVersion, rememberDeployVersion, reloadForDeploy])

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
        reloadForDeploy(remoteVersion)
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
  }, [clientMounted, checkForDeployUpdate, reloadForDeploy])

  return null
}
