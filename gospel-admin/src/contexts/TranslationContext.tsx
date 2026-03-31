'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'
import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'

export type { BibleTranslation }

interface TranslationContextType {
  translation: BibleTranslation
  setTranslation: (translation: BibleTranslation) => Promise<void>
  isLoading: boolean
  enabledTranslations: string[]
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

const STORAGE_KEY = 'gospel-preferred-translation'

const FALLBACK_ENABLED_TRANSLATIONS = ['esv'] as const

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [translation, setTranslationState] = useState<BibleTranslation>('esv')
  const [isLoading, setIsLoading] = useState(true)
  const [enabledTranslations, setEnabledTranslations] = useState<string[]>(['esv'])
  const supabase = createClient()

  // Load enabled translations
  useEffect(() => {
    async function loadEnabledTranslations() {
      try {
        const response = await fetch('/api/translations/enabled')
        const data = await response.json()
        const codes = data.translations?.map((t: any) => t.translation_code) || [...FALLBACK_ENABLED_TRANSLATIONS]
        setEnabledTranslations(codes)
        return codes
      } catch (error) {
        logger.error('Error loading enabled translations:', error)
        setEnabledTranslations([...FALLBACK_ENABLED_TRANSLATIONS])
        return [...FALLBACK_ENABLED_TRANSLATIONS]
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
        const enabled = data.translations?.map((t: any) => t.translation_code) || [...FALLBACK_ENABLED_TRANSLATIONS]
        setEnabledTranslations(enabled)
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
          setEnabledTranslations([...FALLBACK_ENABLED_TRANSLATIONS])
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadTranslation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save translation preference (always localStorage; API sync when logged in)
  const setTranslation = async (newTranslation: BibleTranslation) => {
    try {
      setTranslationState(newTranslation)
      localStorage.setItem(STORAGE_KEY, newTranslation)

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
    <TranslationContext.Provider value={{ translation, setTranslation, isLoading, enabledTranslations }}>
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
