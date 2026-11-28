'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  grokVoiceRequestHeaders,
  noteGrokVoiceRejection,
  readGrokVoiceToken,
} from '@/lib/grokVoiceTokenStorage'

export function useGrokVoiceEnabled(isHydrated: boolean): { enabled: boolean; refresh: () => void } {
  const [acceptedToken, setAcceptedToken] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const refresh = useCallback(() => setNonce((current) => current + 1), [])
  const token = isHydrated ? readGrokVoiceToken() : null

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void fetch('/api/read-aloud/access', {
      headers: grokVoiceRequestHeaders(token),
      cache: 'no-store',
    })
      .then(async (response) => {
        await noteGrokVoiceRejection(response)
        if (cancelled) return
        const current = readGrokVoiceToken()
        if (response.status === 401 || current !== token) {
          setAcceptedToken(null)
          return
        }
        if (!response.ok) {
          setAcceptedToken(token)
          return
        }
        const body = (await response.json()) as { enabled?: unknown }
        setAcceptedToken(body.enabled === true ? token : null)
      })
      .catch(() => {
        if (!cancelled && readGrokVoiceToken() === token) setAcceptedToken(token)
      })
    return () => {
      cancelled = true
    }
  }, [token, nonce])

  return { enabled: token != null && acceptedToken === token, refresh }
}
