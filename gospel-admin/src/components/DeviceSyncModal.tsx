'use client'

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react'
import { createPortal } from 'react-dom'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { PAIRING_CODE_CLAIM_POLL_MS, PAIRING_CODE_TTL_MS } from '@/lib/gospelDeviceSync/constants'
import {
  claimPairingCode,
  completePairingFromClaim,
  createPairingSession,
  fetchPairingCodePending,
  finalizeDeviceSyncEnabled,
  preparePrimaryDevicePairing,
  pushFullSnapshot,
  wrapAndUploadPairingEnvelope,
} from '@/lib/gospelDeviceSync/client'
import {
  DEVICE_SYNC_STATE_CHANGED_EVENT,
  disableDeviceSyncLocal,
  emitDeviceSyncStateChanged,
  isDeviceSyncActive,
} from '@/lib/gospelDeviceSync/dirty'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'

/** @deprecated Modal auto-detects sync state; kept for tests. */
export type DeviceSyncModalMode = 'create' | 'enter' | 'both'

export interface DeviceSyncModalProps {
  isOpen: boolean
  onClose: () => void
  /** @deprecated Modal auto-detects sync state; kept for tests. */
  initialMode?: DeviceSyncModalMode
}

type SetupPanel = 'create' | 'enter'
type ManageView = 'overview' | 'link-device'

function subscribeDeviceSyncActive(onStoreChange: () => void): () => void {
  window.addEventListener(DEVICE_SYNC_STATE_CHANGED_EVENT, onStoreChange)
  return () => window.removeEventListener(DEVICE_SYNC_STATE_CHANGED_EVENT, onStoreChange)
}

function readDeviceSyncActiveSnapshot(): boolean {
  return isDeviceSyncActive()
}

function readDeviceSyncActiveServerSnapshot(): boolean {
  return false
}

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition-colors cursor-pointer min-h-[48px] disabled:opacity-60 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 active:bg-blue-200 dark:active:bg-blue-900/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'

const primaryButtonSmClass =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 active:bg-blue-200 dark:active:bg-blue-900/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'

const secondaryButtonClass =
  'w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition-colors cursor-pointer min-h-[48px] border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'

function setupTabClass(active: boolean): string {
  return `flex-1 px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
    active
      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-500'
      : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border-transparent'
  }`
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

function resetCreateFlowState(
  setCode: (code: string) => void,
  setExpiresAt: (expiresAt: string | null) => void,
  setError: (error: string | null) => void,
  setCreateRequested: (requested: boolean) => void,
  setCodeClaimed: (claimed: boolean) => void,
  createStartedRef: MutableRefObject<boolean>
): void {
  createStartedRef.current = false
  setCode('')
  setExpiresAt(null)
  setError(null)
  setCreateRequested(false)
  setCodeClaimed(false)
}

export default function DeviceSyncModal({
  isOpen,
  onClose,
  initialMode,
}: DeviceSyncModalProps) {
  usePostHogModalOpen('device_sync', isOpen)
  const { showConfirm } = useAlertModal()
  const titleId = useId()
  const syncActive = useSyncExternalStore(
    subscribeDeviceSyncActive,
    readDeviceSyncActiveSnapshot,
    readDeviceSyncActiveServerSnapshot
  )
  const [manageView, setManageView] = useState<ManageView>('overview')
  const [setupPanel, setSetupPanel] = useState<SetupPanel>(
    initialMode === 'enter' ? 'enter' : 'create'
  )
  const [code, setCode] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [countdownMs, setCountdownMs] = useState(0)
  const [enterCode, setEnterCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createRequested, setCreateRequested] = useState(
    () => initialMode === 'create' && !isDeviceSyncActive()
  )
  const [codeClaimed, setCodeClaimed] = useState(false)
  const createStartedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      createStartedRef.current = false
    }
  }, [isOpen])

  const inLinkDeviceFlow = syncActive && manageView === 'link-device'
  const inSetupCreate =
    !syncActive && setupPanel === 'create' && (initialMode === 'create' || initialMode === 'both' || initialMode == null)
  const autoStartCreate =
    inLinkDeviceFlow || (inSetupCreate && initialMode === 'create') || (inSetupCreate && createRequested)

  const startCreateFlow = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const { syncKey, storageId } = await preparePrimaryDevicePairing()
      const session = await createPairingSession(storageId)
      await wrapAndUploadPairingEnvelope(syncKey, storageId, session.code)
      await pushFullSnapshot(syncKey, storageId)
      finalizeDeviceSyncEnabled(syncKey)
      setCode(session.code)
      setExpiresAt(session.expiresAt)
      emitDeviceSyncStateChanged()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create a pairing code.'
      setError(msg)
      createStartedRef.current = false
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (!autoStartCreate || createStartedRef.current) return
    createStartedRef.current = true
    void startCreateFlow()
  }, [isOpen, autoStartCreate, startCreateFlow])

  useEffect(() => {
    if (!expiresAt) return undefined
    const tick = () => {
      setCountdownMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => clearInterval(id)
  }, [expiresAt])

  useEffect(() => {
    if (!isOpen || !code || codeClaimed) return undefined
    const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN
    if (!expiresAt || Number.isNaN(expiresMs)) return undefined

    let cancelled = false

    const pollClaimStatus = async () => {
      if (cancelled || Date.now() >= expiresMs) return
      try {
        const pending = await fetchPairingCodePending(code)
        if (cancelled || pending) return
        if (Date.now() < expiresMs) {
          setCodeClaimed(true)
        }
      } catch {
        /* ignore transient poll errors */
      }
    }

    void pollClaimStatus()
    const id = window.setInterval(() => void pollClaimStatus(), PAIRING_CODE_CLAIM_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [isOpen, code, codeClaimed, expiresAt])

  const beginCreateFlow = () => {
    if (createStartedRef.current) return
    createStartedRef.current = true
    void startCreateFlow()
  }

  const requestCreateCode = () => {
    setCreateRequested(true)
    beginCreateFlow()
  }

  const handleRetryCreate = () => {
    resetCreateFlowState(
      setCode,
      setExpiresAt,
      setError,
      setCreateRequested,
      setCodeClaimed,
      createStartedRef
    )
    if (syncActive && manageView === 'link-device') {
      setCreateRequested(true)
    }
    beginCreateFlow()
  }

  const openLinkAnotherDevice = () => {
    resetCreateFlowState(
      setCode,
      setExpiresAt,
      setError,
      setCreateRequested,
      setCodeClaimed,
      createStartedRef
    )
    setManageView('link-device')
    setCreateRequested(true)
  }

  const backToManageOverview = () => {
    resetCreateFlowState(
      setCode,
      setExpiresAt,
      setError,
      setCreateRequested,
      setCodeClaimed,
      createStartedRef
    )
    setManageView('overview')
  }

  const handleRemoveSync = async () => {
    const ok = await showConfirm(
      'Stop syncing on this device? Your data on this device stays; other linked devices are unaffected.'
    )
    if (!ok) return
    disableDeviceSyncLocal()
    emitDeviceSyncStateChanged()
    onClose()
  }

  const handleClaim = async () => {
    const trimmed = enterCode.replace(/\D/g, '').slice(0, 6)
    if (trimmed.length !== 6) {
      setError('Enter the 6-digit code from your other device.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const claim = await claimPairingCode(trimmed)
      await completePairingFromClaim(trimmed, claim)
      emitDeviceSyncStateChanged()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not link this device.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  const codeExpired = expiresAt != null && countdownMs <= 0
  const showSetupCreatePrompt = inSetupCreate && !createRequested && !code && !busy
  const showTryAgain = !code && !busy && error != null
  const showRegenerateCode = !busy && codeExpired && !codeClaimed

  const renderPairingCodeClaimedPanel = (options: { showBack?: boolean }) => (
    <div className="space-y-4 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Your other device is linked. Bookmarks, highlights, and your other saved data will stay in
        sync.
      </p>
      {options.showBack ? (
        <button type="button" onClick={backToManageOverview} className={`w-full ${primaryButtonClass}`}>
          Done
        </button>
      ) : (
        <button type="button" onClick={onClose} className={`w-full ${primaryButtonClass}`}>
          Done
        </button>
      )}
    </div>
  )

  const renderCreateCodePanel = (options: { showBack?: boolean }) => (
    <div className="space-y-3 text-center">
      {options.showBack ? (
        <button
          type="button"
          onClick={backToManageOverview}
          className="text-sm text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
        >
          Back
        </button>
      ) : null}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Enter this code on your other device before it expires.
      </p>
      {showSetupCreatePrompt ? (
        <button
          type="button"
          onClick={requestCreateCode}
          disabled={busy}
          className={`${primaryButtonClass} w-full`}
        >
          Create pairing code
        </button>
      ) : null}
      {busy && !code ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Creating code…</p>
      ) : code ? (
        <p
          className="text-4xl font-bold tracking-[0.35em] text-slate-900 dark:text-slate-50 tabular-nums"
          aria-label={`Pairing code ${code.split('').join(' ')}`}
        >
          {code}
        </p>
      ) : null}
      {expiresAt ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {codeExpired ? 'This code has expired.' : `Expires in ${formatCountdown(countdownMs)}`}
        </p>
      ) : null}
      {showTryAgain || showRegenerateCode ? (
        <button
          type="button"
          onClick={handleRetryCreate}
          disabled={busy}
          className={primaryButtonSmClass}
        >
          {showRegenerateCode ? 'Create new code' : 'Try again'}
        </button>
      ) : null}
    </div>
  )

  const renderEnterCodePanel = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Enter the 6-digit code shown on your other device.
      </p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={enterCode}
        onChange={(e) => {
          setEnterCode(e.target.value.replace(/\D/g, '').slice(0, 6))
          setError(null)
        }}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-slate-900 dark:text-slate-100"
        aria-label="6-digit pairing code"
      />
      <button
        type="button"
        onClick={() => void handleClaim()}
        disabled={busy || enterCode.length !== 6}
        className={`w-full ${primaryButtonClass}`}
      >
        {busy ? 'Linking…' : 'Link device'}
      </button>
    </div>
  )

  return createPortal(
    <div
      className="gospel-modal-safe-overlay fixed inset-0 z-60 flex items-start justify-center overflow-x-hidden bg-black/50 dark:bg-black/70 pt-[max(2.5rem,env(safe-area-inset-top,0))] sm:pt-[max(3.5rem,env(safe-area-inset-top,0))] pb-[max(2rem,max(48px,env(safe-area-inset-bottom,0)))] pl-[max(1rem,env(safe-area-inset-left,0))] pr-[max(1rem,env(safe-area-inset-right,0))]"
      onClick={onClose}
      role="presentation"
      data-tour="device-sync-modal"
    >
      <div
        className="gospel-modal-safe-panel min-w-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[calc(100dvh-max(2.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] sm:max-h-[calc(100dvh-max(3.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-200 dark:border-slate-600 px-5 py-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Sync across devices
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="gospel-modal-safe-scroll flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {codeClaimed ? (
            renderPairingCodeClaimedPanel({ showBack: inLinkDeviceFlow })
          ) : code || inLinkDeviceFlow ? (
            renderCreateCodePanel({ showBack: inLinkDeviceFlow })
          ) : syncActive ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your bookmarks, highlights, and other saved data sync in the background across linked
                devices.
              </p>
              <button
                type="button"
                onClick={openLinkAnotherDevice}
                className={`w-full ${primaryButtonClass}`}
              >
                Link another device
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveSync()}
                className={secondaryButtonClass}
              >
                Remove sync on this device
              </button>
            </div>
          ) : (
            <>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSetupPanel('create')}
                  className={setupTabClass(setupPanel === 'create')}
                >
                  Create a code
                </button>
                <button
                  type="button"
                  onClick={() => setSetupPanel('enter')}
                  className={setupTabClass(setupPanel === 'enter')}
                >
                  Enter a code
                </button>
              </div>
              {setupPanel === 'create' ? renderCreateCodePanel({}) : renderEnterCodePanel()}
            </>
          )}

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug border-t border-slate-200 dark:border-slate-600 pt-3">
            Your library is encrypted. Only devices you link can read it. Pairing codes expire in{' '}
            {Math.round(PAIRING_CODE_TTL_MS / 60_000)} minutes.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
