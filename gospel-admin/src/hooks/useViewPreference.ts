import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ViewPreference = 'list' | 'card'

const STORAGE_KEY = 'gospel-view-preference'

/**
 * Hook to manage user's view preference (list or card) for profiles and templates.
 * For authenticated users: syncs with database
 * For unauthenticated users: persists in localStorage
 * 
 * Strategy:
 * 1. Load from localStorage immediately (fast, no lag)
 * 2. Fetch from database in background if user is authenticated
 * 3. Update UI if database value differs
 * 4. Save to both localStorage and database when preference changes
 */
export function useViewPreference(defaultView: ViewPreference = 'list'): [ViewPreference, (view: ViewPreference) => void] {
  const [view, setViewState] = useState<ViewPreference>(defaultView)
  const [isHydrated, setIsHydrated] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string | null>(null)

  // Load preference on mount
  useEffect(() => {
    const initializePreference = async () => {
      // 1. Load from localStorage immediately
      const saved = localStorage.getItem(STORAGE_KEY) as ViewPreference | null
      if (saved === 'list' || saved === 'card') {
        setViewState(saved)
      }
      
      // 2. If user is authenticated, fetch from database
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        userIdRef.current = user.id
        
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('view_preference')
            .eq('id', user.id)
            .single()
          
          if (!error && data && typeof data === 'object' && 'view_preference' in data) {
            const dbPreference = (data as any).view_preference as ViewPreference
            if (dbPreference === 'list' || dbPreference === 'card') {
              setViewState(dbPreference)
              localStorage.setItem(STORAGE_KEY, dbPreference)
            }
          }
        } catch (err) {
          // Silently fail and use localStorage value
          console.debug('Failed to load view preference from database:', err)
        }
      }
      
      setIsHydrated(true)
    }

    initializePreference()
  }, [])

  // Persist preference to both localStorage and database when it changes
  const setView = (newView: ViewPreference) => {
    setViewState(newView)
    localStorage.setItem(STORAGE_KEY, newView)

    // If user is authenticated, save to database (with debounce to avoid hammering DB)
    if (userIdRef.current) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        saveToDatabase(newView, userIdRef.current!)
      }, 500)
    }
  }

  return [view, setView]
}

/**
 * Saves view preference to database for authenticated user
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveToDatabase(preference: ViewPreference, userId: string): Promise<any> {
  try {
    const supabase = createClient() as any
    await supabase
      .from('user_profiles')
      .update({ view_preference: preference })
      .eq('id', userId)
  } catch (err) {
    // Silently fail - preference is still saved in localStorage as fallback
    console.debug('Failed to save view preference to database:', err)
  }
}
