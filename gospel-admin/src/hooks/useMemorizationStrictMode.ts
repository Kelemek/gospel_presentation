import { useCallback, useEffect, useState } from 'react'
import {
  GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT,
  readMemorizationStrictModeFromStorage,
  writeMemorizationStrictModeToStorage,
} from '@/lib/memorizationStrictModeStorage'

/**
 * Device-local memorization practice strict mode (Normal vs Strict).
 * Hydrates from localStorage on mount and listens for same-tab updates.
 */
export function useMemorizationStrictMode(): [boolean, (strict: boolean) => void] {
  const [strictMode, setStrictModeState] = useState(() =>
    typeof window === 'undefined' ? false : readMemorizationStrictModeFromStorage()
  )

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ strict?: boolean }>).detail
      if (typeof detail?.strict === 'boolean') {
        setStrictModeState(detail.strict)
        return
      }
      setStrictModeState(readMemorizationStrictModeFromStorage())
    }

    window.addEventListener(GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT, onChanged)
    window.addEventListener('storage', onChanged)
    return () => {
      window.removeEventListener(GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT, onChanged)
      window.removeEventListener('storage', onChanged)
    }
  }, [])

  const setStrictMode = useCallback((strict: boolean) => {
    setStrictModeState(strict)
    writeMemorizationStrictModeToStorage(strict)
  }, [])

  return [strictMode, setStrictMode]
}
