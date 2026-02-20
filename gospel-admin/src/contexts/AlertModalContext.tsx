'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

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

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertModalState>({
    isOpen: false,
    message: '',
    variant: 'alert'
  })
  const resolveRef = useRef<(value: boolean) => void | null>(null)

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
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-modal-title"
          onClick={state.variant === 'alert' ? handleClose : undefined}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
              <p id="alert-modal-title" className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap">
                {state.message}
              </p>
            </div>
            <div className="px-6 py-4 bg-white flex justify-end gap-3">
              {state.variant === 'confirm' && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={state.variant === 'alert' ? handleClose : handleConfirm}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 font-medium transition-colors"
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
