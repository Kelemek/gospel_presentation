'use client'

import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { GOSPEL_CLIENT_STORAGE_CHANGED_EVENT } from '@/lib/gospelClientStorageEvents'

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

function onClientStorageChanged(event: Event): void {
  const key = (event as CustomEvent<{ key: string }>).detail?.key
  if (key === STORAGE_KEY) notify()
}

function addStorageListeners() {
  if (typeof window === 'undefined' || storageListenerAdded) return
  storageListenerAdded = true
  window.addEventListener('storage', onStorage)
  window.addEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
}

function removeStorageListeners() {
  if (typeof window === 'undefined' || !storageListenerAdded) return
  storageListenerAdded = false
  window.removeEventListener('storage', onStorage)
  window.removeEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
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
      gospelStorageSetSync(STORAGE_KEY, next)
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
