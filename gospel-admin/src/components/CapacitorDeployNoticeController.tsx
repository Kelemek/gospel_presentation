'use client'

import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import {
  CAPACITOR_DEPLOY_CHECK_INTERVAL_MS,
  fetchAppDeployInfo,
  getSeenChangelogCount,
  getEffectiveDeployBaseline,
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
  WEB_REFRESH_AFTER_UPDATE_NOTICE,
} from '@/lib/capacitorDeployNotice'
import { hasPresentationWelcomeBeenDismissed } from '@/lib/presentationWelcomeStorage'
import { attemptCapacitorRecoveryReload } from '@/lib/capacitorAppRecovery'

const subscribeClientMounted = () => () => {}

/**
 * Detects deploy updates and shows missed release notes ("what's new") on web and
 * native once the first-visit welcome has been dismissed. On Capacitor native,
 * also detects stale bundles / mid-session deploys and asks the user to close
 * and reopen the app — no automatic reload.
 */
export function CapacitorDeployNoticeController() {
  const { showAlert } = useAlertModal()
  const clientMounted = useSyncExternalStore(
    subscribeClientMounted,
    () => true,
    () => false
  )
  const noticePendingRef = useRef(false)
  const staleChunkNoticeInFlightRef = useRef(false)
  /** Fallback when sessionStorage is unavailable (private mode / quota). */
  const inMemoryDeployVersionRef = useRef<string | null>(null)

  const baselineDeployVersion = useCallback(
    () => getEffectiveDeployBaseline(inMemoryDeployVersionRef.current),
    []
  )

  const rememberDeployVersion = useCallback((version: string) => {
    inMemoryDeployVersionRef.current = version
    setStoredCapacitorDeployVersion(version)
  }, [])

  const promptRestartIfNeeded = useCallback(
    (remoteVersion: string | null, unseenMessages: string[]) => {
      if (!remoteVersion || noticePendingRef.current) return
      if (!shouldShowCapacitorDeployNotice(remoteVersion)) return

      noticePendingRef.current = true
      markCapacitorDeployNoticeShown(remoteVersion)
      showAlert(buildCapacitorRestartAppNotice(unseenMessages))
      noticePendingRef.current = false
    },
    [showAlert]
  )

  const promptWhatsNewIfNeeded = useCallback(
    (
      messages: string[],
      remoteVersion: string,
      changelog: string[],
      options?: { midSession?: boolean }
    ) => {
      if (!messages.length || noticePendingRef.current) return
      if (!options?.midSession && !shouldShowCapacitorWhatsNewOnColdStart()) return

      const notice = buildCapacitorWhatsNewNotice(messages)
      if (!notice) return

      noticePendingRef.current = true
      if (!options?.midSession) {
        markCapacitorWhatsNewShownThisSession()
      }
      acknowledgeCapacitorDeployChangelog(changelog, remoteVersion)
      showAlert(notice)
      noticePendingRef.current = false
    },
    [showAlert]
  )

  const checkForDeployUpdate = useCallback(async () => {
    const { version: remoteVersion, changelog } = await fetchAppDeployInfo()
    if (!remoteVersion) return

    const isNative = Capacitor.isNativePlatform()
    const baselineVersion = baselineDeployVersion()
    const unseenMessages = getUnseenChangelogMessages(changelog, getSeenChangelogCount())

    if (!baselineVersion) {
      if (!hasPresentationWelcomeBeenDismissed()) {
        return
      }

      rememberDeployVersion(remoteVersion)

      if (unseenMessages.length > 0) {
        promptWhatsNewIfNeeded(unseenMessages, remoteVersion, changelog)
        return
      }

      acknowledgeCapacitorDeployChangelog(changelog, remoteVersion)
      return
    }

    if (!isCapacitorDeployVersionStale(baselineVersion, remoteVersion)) {
      return
    }

    if (isNative) {
      promptRestartIfNeeded(remoteVersion, unseenMessages)
      return
    }

    if (!hasPresentationWelcomeBeenDismissed()) {
      return
    }

    if (unseenMessages.length > 0) {
      promptWhatsNewIfNeeded(unseenMessages, remoteVersion, changelog, { midSession: true })
    } else {
      acknowledgeCapacitorDeployChangelog(changelog, remoteVersion)
    }
    rememberDeployVersion(remoteVersion)
  }, [
    baselineDeployVersion,
    rememberDeployVersion,
    promptRestartIfNeeded,
    promptWhatsNewIfNeeded,
  ])

  const deployNoticeHandlersRef = useRef({
    checkForDeployUpdate,
    promptRestartIfNeeded,
    rememberDeployVersion,
    showAlert,
  })

  useEffect(() => {
    deployNoticeHandlersRef.current = {
      checkForDeployUpdate,
      promptRestartIfNeeded,
      rememberDeployVersion,
      showAlert,
    }
  }, [checkForDeployUpdate, promptRestartIfNeeded, rememberDeployVersion, showAlert])

  useEffect(() => {
    if (!clientMounted) return

    const runCheck = () => {
      void deployNoticeHandlersRef.current.checkForDeployUpdate()
    }

    const initialCheckId = window.setTimeout(runCheck, 0)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const onWindowFocus = () => {
      runCheck()
    }
    window.addEventListener('focus', onWindowFocus)

    const onOnline = () => {
      runCheck()
    }
    window.addEventListener('online', onOnline)

    const intervalId = window.setInterval(runCheck, CAPACITOR_DEPLOY_CHECK_INTERVAL_MS)

    const onStaleChunkError = () => {
      if (staleChunkNoticeInFlightRef.current) return
      staleChunkNoticeInFlightRef.current = true

      void fetchAppDeployInfo()
        .then(({ version, changelog }) => {
          const {
            promptRestartIfNeeded: promptRestart,
            rememberDeployVersion: rememberVersion,
            showAlert: alert,
          } = deployNoticeHandlersRef.current
          const unseen = getUnseenChangelogMessages(changelog, getSeenChangelogCount())
          const remoteVersion = version ?? 'stale-chunk'
          const isNative = Capacitor.isNativePlatform()

          if (isNative) {
            if (attemptCapacitorRecoveryReload('stale-chunk')) return
            promptRestart(remoteVersion, unseen)
            return
          }

          if (!hasPresentationWelcomeBeenDismissed()) return
          if (noticePendingRef.current) return

          const whatsNew = unseen.length > 0 ? buildCapacitorWhatsNewNotice(unseen) : null
          const notice = whatsNew ?? WEB_REFRESH_AFTER_UPDATE_NOTICE
          noticePendingRef.current = true
          try {
            if (whatsNew) {
              acknowledgeCapacitorDeployChangelog(changelog, remoteVersion)
            }
            alert(notice)
            rememberVersion(remoteVersion)
          } finally {
            noticePendingRef.current = false
          }
        })
        .finally(() => {
          staleChunkNoticeInFlightRef.current = false
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
  }, [clientMounted])

  return null
}
