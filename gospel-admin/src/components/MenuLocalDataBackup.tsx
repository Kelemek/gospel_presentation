'use client'

import type { MutableRefObject } from 'react'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import DeviceSyncModal from '@/components/DeviceSyncModal'
import {
  applyGospelLocalUserDataImport,
  buildGospelLocalUserDataPayload,
  downloadGospelLocalUserDataBackup,
  parseGospelLocalUserDataImport,
} from '@/lib/gospelLocalUserDataBackup'

const tocControlButtonClass =
  'inline-flex items-center justify-start w-full pl-12 pr-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer'

const iconSlotClass =
  'mr-3 inline-flex h-6 w-6 shrink-0 items-center justify-center text-slate-600 dark:text-slate-300'
const iconSvgClass = 'h-5 w-5'

const betaBadgeClass =
  'ml-2 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800'

export interface MenuLocalDataBackupProps {
  /**
   * When set, opening the restore file picker or sync modal sets this to `true` so the profile
   * slide-out can skip `onMouseLeave` auto-close (otherwise the menu unmounts before the flow
   * finishes—common on Edge/desktop and when fixed overlays render inside the scroll panel).
   */
  deferCloseMenuForFilePickerRef?: MutableRefObject<boolean>
}

export default function MenuLocalDataBackup(props: MenuLocalDataBackupProps = {}) {
  const { deferCloseMenuForFilePickerRef } = props
  const { showAlert, showConfirm } = useAlertModal()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const endFilePickerWatchRef = useRef<(() => void) | null>(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncModalKey, setSyncModalKey] = useState(0)

  const clearFilePickerWatch = useCallback(() => {
    endFilePickerWatchRef.current?.()
    endFilePickerWatchRef.current = null
    if (deferCloseMenuForFilePickerRef) {
      deferCloseMenuForFilePickerRef.current = false
    }
  }, [deferCloseMenuForFilePickerRef])

  const setDeferMenuClose = useCallback(
    (defer: boolean) => {
      if (deferCloseMenuForFilePickerRef) {
        deferCloseMenuForFilePickerRef.current = defer
      }
    },
    [deferCloseMenuForFilePickerRef]
  )

  const closeSyncModal = useCallback(() => {
    setSyncModalOpen(false)
    setDeferMenuClose(false)
  }, [setDeferMenuClose])

  useEffect(() => () => clearFilePickerWatch(), [clearFilePickerWatch])

  useEffect(() => {
    if (!syncModalOpen) return undefined
    return () => setDeferMenuClose(false)
  }, [syncModalOpen, setDeferMenuClose])

  const handleSave = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const payload = await buildGospelLocalUserDataPayload(window.localStorage)
      await downloadGospelLocalUserDataBackup(payload)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      void showAlert(`Could not save your data.\n\n${msg}`)
    }
  }, [showAlert])

  const handleRestoreClick = useCallback(() => {
    clearFilePickerWatch()
    if (deferCloseMenuForFilePickerRef) {
      deferCloseMenuForFilePickerRef.current = true
    }
    const onEnd = () => {
      clearFilePickerWatch()
    }
    queueMicrotask(() => {
      fileInputRef.current?.click()
    })
    window.setTimeout(() => {
      window.addEventListener('focus', onEnd, true)
      document.addEventListener('visibilitychange', onEnd)
      endFilePickerWatchRef.current = () => {
        window.removeEventListener('focus', onEnd, true)
        document.removeEventListener('visibilitychange', onEnd)
      }
    }, 0)
  }, [clearFilePickerWatch, deferCloseMenuForFilePickerRef])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      clearFilePickerWatch()
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || typeof window === 'undefined') return

      let text: string
      try {
        text = await file.text()
      } catch {
        void showAlert('Could not read the file you picked. Try again or choose another file.')
        return
      }

      let payload
      try {
        payload = parseGospelLocalUserDataImport(text)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid file.'
        void showAlert(msg)
        return
      }

      const ok = await showConfirm(
        'This will replace bookmarks, highlights, memorized verses, pinned passages, your saved answers, Daily Verse Hunt progress, Listen and reading resume positions, M\'Cheyne plan start date, which What\'s new notes you\'ve already seen, which presentations you have read to the end, and display settings on this device with the data from this file.\n\nContinue?'
      )
      if (!ok) return

      try {
        await applyGospelLocalUserDataImport(payload, window.localStorage)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Restore failed.'
        void showAlert(msg)
        return
      }

      window.location.reload()
    },
    [clearFilePickerWatch, showAlert, showConfirm]
  )

  const openSyncModal = useCallback(() => {
    setDeferMenuClose(true)
    setSyncModalKey((k) => k + 1)
    setSyncModalOpen(true)
  }, [setDeferMenuClose])

  return (
    <div className="mt-6 space-y-3 print-hide" data-tour="menu-local-data-backup">
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
        Bookmarks, highlights, memorized verses, pins, answers, Daily Verse Hunt progress, Listen and reading resume, M&apos;Cheyne start date, which What&apos;s new notes you&apos;ve already seen, read-to-end marks for presentations, and display options saved on this device only. You can also sync them across devices with an encrypted pairing code.
      </p>
      {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
          After <strong>Save my data</strong>, swipe up on the share sheet for the full app list—look for{' '}
          <strong>Files</strong>, <strong>Drive</strong> (save then download in Drive), or another app you use
          for downloads. The backup is JSON (Android may use a <code className="text-[11px]">.txt</code> name so
          more save options appear).
        </p>
      ) : null}
      <div className="space-y-3">
        <button type="button" onClick={handleSave} className={tocControlButtonClass}>
          <span className={iconSlotClass} aria-hidden>
            <svg className={iconSvgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </span>
          Save my data
        </button>
        <button type="button" onClick={handleRestoreClick} className={tocControlButtonClass}>
          <span className={iconSlotClass} aria-hidden>
            <svg className={iconSvgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </span>
          Restore my data
        </button>
        <button
          type="button"
          onClick={openSyncModal}
          className={tocControlButtonClass}
          data-tour="menu-device-sync"
        >
          <span className={iconSlotClass} aria-hidden>
            <svg className={iconSvgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </span>
          Sync my data
          <span className={betaBadgeClass}>Beta</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,text/plain,.txt"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <DeviceSyncModal key={syncModalKey} isOpen={syncModalOpen} onClose={closeSyncModal} />
    </div>
  )
}
