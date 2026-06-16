'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useLayoutEffect } from 'react'

const THEME_STORAGE_KEY = 'gospel-profile-theme'

function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

type AlertModalVariant = 'alert' | 'confirm'

type AlertModalContent = string | React.ReactNode

interface AlertModalState {
  isOpen: boolean
  message: AlertModalContent
  variant: AlertModalVariant
}

interface AlertModalContextType {
  showAlert: (message: AlertModalContent) => void
  showConfirm: (message: string) => Promise<boolean>
}

const AlertModalContext = createContext<AlertModalContextType | null>(null)

/** Renders message; if it contains a blank line (\n\n), the first paragraph is emphasized. */
function AlertModalMessage({ message }: { message: AlertModalContent }) {
  if (typeof message !== 'string') {
    return <>{message}</>
  }
  const parts = message.split(/\n\n/)
  if (parts.length === 1) {
    return <span className="whitespace-pre-wrap">{message}</span>
  }
  const head = parts[0]
  const rest = parts.slice(1).join('\n\n')
  return (
    <>
      <strong className="font-semibold">{head}</strong>
      {'\n\n'}
      <span className="whitespace-pre-wrap">{rest}</span>
    </>
  )
}

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertModalState>({
    isOpen: false,
    message: '',
    variant: 'alert'
  })
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const resolveRef = useRef<(value: boolean) => void | null>(null)

  useLayoutEffect(() => {
    queueMicrotask(() => setTheme(getTheme()))
    const onStorage = () => setTheme(getTheme())
    window.addEventListener('storage', onStorage)
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (media) media.addEventListener('change', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      if (media) media.removeEventListener('change', onStorage)
    }
  }, [])

  useLayoutEffect(() => {
    if (state.isOpen) queueMicrotask(() => setTheme(getTheme()))
  }, [state.isOpen])

  const showAlert = useCallback((message: AlertModalContent) => {
    setState({ isOpen: true, message, variant: 'alert' })
  }, [])

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ isOpen: true, message, variant: 'confirm' })
    })
  }, [])

  const handleClose = useCallback(() => {
    if (state.variant === 'confirm' && resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
    setState(prev => ({ ...prev, isOpen: false }))
  }, [state.variant])

  const handleConfirm = useCallback(() => {
    if (state.variant === 'confirm' && resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
    setState(prev => ({ ...prev, isOpen: false }))
  }, [state.variant])

  return (
    <AlertModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {state.isOpen && (
        <div
          className={`gospel-modal-safe-overlay fixed inset-0 z-130 flex items-center justify-center bg-black/50 ${theme === 'dark' ? 'dark' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-modal-title"
          onClick={state.variant === 'alert' ? handleClose : undefined}
        >
          <div
            className="gospel-modal-safe-panel bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-600 overflow-hidden flex flex-col min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gospel-modal-safe-scroll px-6 py-5 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <div
                id="alert-modal-title"
                className="text-slate-800 dark:text-slate-100 text-base leading-relaxed whitespace-pre-wrap"
              >
                <AlertModalMessage message={state.message} />
              </div>
            </div>
            <div className="shrink-0 px-6 py-4 bg-white dark:bg-slate-800 flex justify-end gap-3">
              {state.variant === 'confirm' && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                data-tour={
                  state.variant === 'alert'
                    ? 'alert-modal-ok'
                    : state.variant === 'confirm'
                      ? 'alert-modal-confirm'
                      : undefined
                }
                onClick={state.variant === 'alert' ? handleClose : handleConfirm}
                className="cursor-pointer px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white dark:bg-slate-600 dark:hover:bg-slate-500 dark:active:bg-slate-400 font-medium transition-colors"
              >
                {state.variant === 'alert' ? 'OK' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertModalContext.Provider>
  )
}

export function useAlertModal(): AlertModalContextType {
  const ctx = useContext(AlertModalContext)
  if (!ctx) {
    throw new Error('useAlertModal must be used within AlertModalProvider')
  }
  return ctx
}
