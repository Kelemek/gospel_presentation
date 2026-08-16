'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'
import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { GOSPEL_CLIENT_STORAGE_CHANGED_EVENT } from '@/lib/gospelClientStorageEvents'

export type { BibleTranslation }

/** One enabled row from `/api/translations/enabled` (order matches `translation_settings.display_order`). */
export interface EnabledTranslationOption {
  translation_code: string
  translation_name: string
}

interface TranslationContextType {
  translation: BibleTranslation
  setTranslation: (translation: BibleTranslation) => Promise<void>
  isLoading: boolean
  enabledTranslations: BibleTranslation[]
  enabledTranslationOptions: EnabledTranslationOption[]
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

const STORAGE_KEY = 'gospel-preferred-translation'

const DEFAULT_ENABLED_OPTIONS: EnabledTranslationOption[] = [
  { translation_code: 'esv', translation_name: 'ESV (English Standard Version)' },
]

function parseEnabledTranslationsPayload(data: unknown): EnabledTranslationOption[] {
  const raw = data as { translations?: unknown } | null | undefined
  const list = raw?.translations
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_ENABLED_OPTIONS
  }
  return list.map((t: { translation_code?: string; translation_name?: string }) => {
    const code = String(t.translation_code ?? '')
    const name =
      typeof t.translation_name === 'string' && t.translation_name.trim() !== ''
        ? t.translation_name
        : code.toUpperCase()
    return { translation_code: code, translation_name: name }
  })
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [translation, setTranslationState] = useState<BibleTranslation>('esv')
  const [isLoading, setIsLoading] = useState(true)
  const [enabledTranslationOptions, setEnabledTranslationOptions] =
    useState<EnabledTranslationOption[]>(DEFAULT_ENABLED_OPTIONS)
  const supabase = createClient()

  const enabledTranslations = useMemo((): BibleTranslation[] => {
    return enabledTranslationOptions
      .map((o) => o.translation_code.trim().toLowerCase())
      .filter(isBibleTranslation)
  }, [enabledTranslationOptions])

  // Load enabled translations
  useEffect(() => {
    async function loadEnabledTranslations() {
      try {
        const response = await fetch('/api/translations/enabled')
        const data = await response.json()
        setEnabledTranslationOptions(parseEnabledTranslationsPayload(data))
      } catch (error) {
        logger.error('Error loading enabled translations:', error)
        setEnabledTranslationOptions(DEFAULT_ENABLED_OPTIONS)
      }
    }
    loadEnabledTranslations()
  }, [])

  // Load translation preference on mount (localStorage-first; DB overrides when logged in)
  useEffect(() => {
    async function loadTranslation() {
      let enabledListCommitted = false
      try {
        const response = await fetch('/api/translations/enabled')
        const data = await response.json()
        const options = parseEnabledTranslationsPayload(data)
        setEnabledTranslationOptions(options)
        const enabled = options.map((o) => o.translation_code)
        enabledListCommitted = true

        // 1. Read from localStorage first (instant)
        const fromStorage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        const validStorage = isBibleTranslation(fromStorage) ? fromStorage : null

        const { data: { user } } = await supabase.auth.getUser()

        let preferredTranslation: string | null = null

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('preferred_translation')
            .eq('id', user.id)
            .single() as { data: { preferred_translation: string | null } | null }
          const fromDb = profile?.preferred_translation || null
          preferredTranslation = isBibleTranslation(fromDb) ? fromDb : validStorage
        } else {
          preferredTranslation = validStorage
        }

        const resolveTranslation = (): BibleTranslation => {
          if (preferredTranslation && enabled.includes(preferredTranslation)) {
            return preferredTranslation as BibleTranslation
          }
          if (preferredTranslation) {
            logger.debug(
              `Translation ${preferredTranslation} is disabled in admin, using an enabled translation instead`
            )
          }
          if (enabled.includes('esv')) return 'esv'
          const first = enabled[0]
          return isBibleTranslation(first) ? first : 'esv'
        }

        const resolved = resolveTranslation()
        setTranslationState(resolved)
        localStorage.setItem(STORAGE_KEY, resolved)

        if (
          user &&
          preferredTranslation &&
          !enabled.includes(preferredTranslation) &&
          resolved !== preferredTranslation
        ) {
          try {
            await fetch('/api/user/translation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ translation: resolved }),
            })
          } catch {
            logger.warn('Could not sync profile after disabled translation fallback')
          }
        }
      } catch (error) {
        logger.error('Error loading translation preference:', error)
        if (!enabledListCommitted) {
          setEnabledTranslationOptions(DEFAULT_ENABLED_OPTIONS)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadTranslation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onClientStorageChanged = (event: Event) => {
      const key = (event as CustomEvent<{ key: string }>).detail?.key
      if (key !== STORAGE_KEY) return
      const fromStorage = localStorage.getItem(STORAGE_KEY)
      if (isBibleTranslation(fromStorage)) {
        setTranslationState(fromStorage)
      }
    }
    window.addEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
    return () => window.removeEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
  }, [])

  // Save translation preference (always localStorage; API sync when logged in)
  const setTranslation = async (newTranslation: BibleTranslation) => {
    try {
      setTranslationState(newTranslation)
      gospelStorageSetSync(STORAGE_KEY, newTranslation)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) return

      try {
        const response = await fetch('/api/user/translation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ translation: newTranslation })
        })
        if (!response.ok) logger.warn('Translation saved locally but API sync failed')
      } catch {
        logger.warn('Translation saved locally but API sync failed')
      }
    } catch (error) {
      logger.error('Error saving translation preference:', error)
    }
  }

  return (
    <TranslationContext.Provider
      value={{
        translation,
        setTranslation,
        isLoading,
        enabledTranslations,
        enabledTranslationOptions,
      }}
    >
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
