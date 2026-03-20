'use client'

import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'gospel-profile-text-size'

export type TextSize = 'normal' | 'larger' | 'largest'

const ALL_SIZES: TextSize[] = ['normal', 'larger', 'largest']

function isTextSize(value: string | null): value is TextSize {
  return value !== null && ALL_SIZES.includes(value as TextSize)
}

function getStoredTextSize(): TextSize | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  return isTextSize(stored) ? stored : null
}

function getSnapshot(): TextSize {
  return getStoredTextSize() ?? 'normal'
}

function getServerSnapshot(): TextSize {
  return 'normal'
}

const listeners = new Set<() => void>()
let storageListenerAdded = false

function notify() {
  listeners.forEach((l) => l())
}

function onStorage() {
  notify()
}

function addStorageListeners() {
  if (typeof window === 'undefined' || storageListenerAdded) return
  storageListenerAdded = true
  window.addEventListener('storage', onStorage)
}

function removeStorageListeners() {
  if (typeof window === 'undefined' || !storageListenerAdded) return
  storageListenerAdded = false
  window.removeEventListener('storage', onStorage)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  addStorageListeners()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) removeStorageListeners()
  }
}

interface TextSizeContextType {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
}

const TextSizeContext = createContext<TextSizeContextType | null>(null)

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const textSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTextSize = useCallback((next: TextSize) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
      notify()
    }
  }, [])

  const value = useMemo<TextSizeContextType>(() => ({ textSize, setTextSize }), [textSize, setTextSize])
  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>
}

export function useTextSize(): TextSizeContextType {
  const ctx = useContext(TextSizeContext)
  if (!ctx) throw new Error('useTextSize must be used within TextSizeProvider')
  return ctx
}
