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

interface AlertModalState {
  isOpen: boolean
  message: string
  variant: AlertModalVariant
}

interface AlertModalContextType {
  showAlert: (message: string) => void
  showConfirm: (message: string) => Promise<boolean>
}

const AlertModalContext = createContext<AlertModalContextType | null>(null)

/** Renders message; if it contains a blank line (\n\n), the first paragraph is emphasized. */
function AlertModalMessage({ message }: { message: string }) {
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

  const showAlert = useCallback((message: string) => {
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
          className={`fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 ${theme === 'dark' ? 'dark' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-modal-title"
          onClick={state.variant === 'alert' ? handleClose : undefined}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-600 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <p id="alert-modal-title" className="text-slate-800 dark:text-slate-100 text-base leading-relaxed whitespace-pre-wrap">
                <AlertModalMessage message={state.message} />
              </p>
            </div>
            <div className="px-6 py-4 bg-white dark:bg-slate-800 flex justify-end gap-3">
              {state.variant === 'confirm' && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
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
                className="px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white dark:bg-slate-600 dark:hover:bg-slate-500 dark:active:bg-slate-400 font-medium transition-colors"
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
