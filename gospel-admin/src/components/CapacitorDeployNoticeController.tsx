'use client'

import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import {
  CAPACITOR_DEPLOY_CHECK_INTERVAL_MS,
  fetchAppDeployInfo,
  getSeenChangelogCount,
  getStoredCapacitorDeployVersion,
  getUnseenChangelogMessages,
  isCapacitorDeployVersionStale,
  isLikelyStaleChunkLoadError,
  messageFromUnknownError,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'
import {
  acknowledgeCapacitorDeployChangelog,
  buildCapacitorRestartAppNotice,
  buildCapacitorWhatsNewNotice,
  markCapacitorDeployNoticeShown,
  markCapacitorWhatsNewShownThisSession,
  shouldShowCapacitorDeployNotice,
  shouldShowCapacitorWhatsNewOnColdStart,
} from '@/lib/capacitorDeployNotice'
import { hasPresentationWelcomeBeenDismissed } from '@/lib/presentationWelcomeStorage'

const subscribeClientMounted = () => () => {}

/**
 * On Capacitor native, detects a new server deploy (or stale chunk errors) and
 * politely asks the user to close and reopen the app — no automatic reload.
 * After a cold start (or when the app was closed during deploy), shows missed
 * "what's new" notes once the first-visit welcome has been dismissed.
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
    (remoteVersion: string | null, changelogMessage?: string | null) => {
      if (!remoteVersion || noticePendingRef.current) return
      if (!shouldShowCapacitorDeployNotice(remoteVersion)) return

      noticePendingRef.current = true
      markCapacitorDeployNoticeShown(remoteVersion)
      showAlert(buildCapacitorRestartAppNotice(changelogMessage))
      noticePendingRef.current = false
    },
    [showAlert]
  )

  const promptWhatsNewIfNeeded = useCallback(
    (messages: string[], remoteVersion: string, changelog: string[]) => {
      if (!messages.length || noticePendingRef.current) return
      if (!shouldShowCapacitorWhatsNewOnColdStart()) return

      const notice = buildCapacitorWhatsNewNotice(messages)
      if (!notice) return

      noticePendingRef.current = true
      markCapacitorWhatsNewShownThisSession()
      acknowledgeCapacitorDeployChangelog(changelog, remoteVersion)
      showAlert(notice)
      noticePendingRef.current = false
    },
    [showAlert]
  )

  const checkForDeployUpdate = useCallback(async () => {
    const { version: remoteVersion, message, changelog } = await fetchAppDeployInfo()
    if (!remoteVersion) return

    const baselineVersion = baselineDeployVersion()

    if (!baselineVersion) {
      rememberDeployVersion(remoteVersion)

      if (!hasPresentationWelcomeBeenDismissed()) {
        return
      }

      const unseenMessages = getUnseenChangelogMessages(changelog, getSeenChangelogCount())
      if (unseenMessages.length > 0) {
        promptWhatsNewIfNeeded(unseenMessages, remoteVersion, changelog)
        return
      }

      acknowledgeCapacitorDeployChangelog(changelog, remoteVersion)
      return
    }

    if (isCapacitorDeployVersionStale(baselineVersion, remoteVersion)) {
      promptRestartIfNeeded(remoteVersion, message)
    }
  }, [
    baselineDeployVersion,
    rememberDeployVersion,
    promptRestartIfNeeded,
    promptWhatsNewIfNeeded,
  ])

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
      void fetchAppDeployInfo().then(({ version, message }) => {
        promptRestartIfNeeded(version ?? 'stale-chunk', message)
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
