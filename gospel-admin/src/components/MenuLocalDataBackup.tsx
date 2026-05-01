'use client'

import type { MutableRefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
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

export interface MenuLocalDataBackupProps {
  /**
   * When set, opening the restore file picker sets this to `true` so the profile slide-out
   * can skip `onMouseLeave` auto-close (otherwise the menu unmounts before `change` fires—common on Edge/desktop).
   */
  deferCloseMenuForFilePickerRef?: MutableRefObject<boolean>
}

export default function MenuLocalDataBackup(props: MenuLocalDataBackupProps = {}) {
  const { deferCloseMenuForFilePickerRef } = props
  const { showAlert, showConfirm } = useAlertModal()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const endFilePickerWatchRef = useRef<(() => void) | null>(null)

  const clearFilePickerWatch = useCallback(() => {
    endFilePickerWatchRef.current?.()
    endFilePickerWatchRef.current = null
    if (deferCloseMenuForFilePickerRef) {
      deferCloseMenuForFilePickerRef.current = false
    }
  }, [deferCloseMenuForFilePickerRef])

  useEffect(() => () => clearFilePickerWatch(), [clearFilePickerWatch])

  const handleSave = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const payload = buildGospelLocalUserDataPayload(window.localStorage)
      downloadGospelLocalUserDataBackup(payload)
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
        'This will replace bookmarks, memorized verses, pinned passages, your saved answers, and display settings on this device with the data from this file.\n\nContinue?'
      )
      if (!ok) return

      try {
        applyGospelLocalUserDataImport(payload, window.localStorage)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Restore failed.'
        void showAlert(msg)
        return
      }

      window.location.reload()
    },
    [clearFilePickerWatch, showAlert, showConfirm]
  )

  return (
    <div className="mt-6 space-y-3 print-hide" data-tour="menu-local-data-backup">
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
        Bookmarks, memorized verses, pins, answers, and display options saved on this device only.
      </p>
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
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </div>
  )
}
