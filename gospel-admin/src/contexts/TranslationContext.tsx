'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'

export type BibleTranslation = 'esv' | 'kjv' | 'nasb'

interface TranslationContextType {
  translation: BibleTranslation
  setTranslation: (translation: BibleTranslation) => Promise<void>
  isLoading: boolean
  enabledTranslations: string[]
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

const STORAGE_KEY = 'gospel-preferred-translation'

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
        const codes = data.translations?.map((t: any) => t.translation_code) || ['esv']
        setEnabledTranslations(codes)
        return codes
      } catch (error) {
        logger.error('Error loading enabled translations:', error)
        setEnabledTranslations(['esv'])
        return ['esv']
      }
    }
    loadEnabledTranslations()
  }, [])

  // Load translation preference on mount
  useEffect(() => {
    async function loadTranslation() {
      try {
        // First get enabled translations
        const response = await fetch('/api/translations/enabled')
        const data = await response.json()
        const enabled = data.translations?.map((t: any) => t.translation_code) || ['esv']
        
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser()
        
        let preferredTranslation: string | null = null
        
        if (user) {
          // Load from user profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('preferred_translation')
            .eq('id', user.id)
            .single() as { data: { preferred_translation: string | null } | null }
          
          preferredTranslation = profile?.preferred_translation || null
        } else {
          // Load from sessionStorage for anonymous users
          const stored = sessionStorage.getItem(STORAGE_KEY)
          if (stored === 'esv' || stored === 'kjv' || stored === 'nasb') {
            preferredTranslation = stored
          }
        }
        
        // If preferred translation is disabled, fall back to ESV
        if (preferredTranslation && enabled.includes(preferredTranslation)) {
          setTranslationState(preferredTranslation as BibleTranslation)
        } else if (preferredTranslation) {
          // Preferred translation is disabled, use ESV
          logger.debug(`Translation ${preferredTranslation} is disabled, falling back to ESV`)
          setTranslationState('esv')
        }
      } catch (error) {
        logger.error('Error loading translation preference:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTranslation()
  }, [])

  // Save translation preference
  const setTranslation = async (newTranslation: BibleTranslation) => {
    try {
      setTranslationState(newTranslation)
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Save to user profile using direct API call
        await fetch('/api/user/translation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ translation: newTranslation })
        })
      } else {
        // Save to sessionStorage for anonymous users
        sessionStorage.setItem(STORAGE_KEY, newTranslation)
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
