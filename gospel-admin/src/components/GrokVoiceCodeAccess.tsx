'use client'

import { Capacitor } from '@capacitor/core'
import { useState } from 'react'
import {
  clearGrokVoiceToken,
  readGrokVoiceToken,
  writeGrokVoiceToken,
} from '@/lib/grokVoiceTokenStorage'
import { DEVICE_LISTEN_VOICE_ID, writeResourceListenVoice } from '@/lib/resourceListenVoiceStorage'

const linkClass =
  'cursor-pointer text-sm font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-200'

interface GrokVoiceCodeAccessProps {
  onChanged: () => void
}

export function GrokVoiceCodeAccess({ onChanged }: GrokVoiceCodeAccessProps) {
  const hasToken = readGrokVoiceToken() != null
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const redeem = async () => {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Enter the code from your administrator.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/grok-voice/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ code: trimmed, deviceLabel: Capacitor.getPlatform() }),
      })
      if (response.status === 404) {
        setError('That code could not be used.')
        return
      }
      if (response.status === 429) {
        setError('Too many tries. Wait a few minutes and try again.')
        return
      }
      if (!response.ok) {
        setError('Grok voice is not available right now.')
        return
      }
      const body = (await response.json()) as { token?: unknown }
      if (typeof body.token !== 'string') {
        setError('Grok voice is not available right now.')
        return
      }
      writeGrokVoiceToken(body.token)
      if (!readGrokVoiceToken()) {
        setError('Grok voice is not available right now.')
        return
      }
      setCode('')
      setOpen(false)
      onChanged()
    } catch {
      setError('Grok voice is not available right now.')
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    clearGrokVoiceToken()
    writeResourceListenVoice(DEVICE_LISTEN_VOICE_ID)
    setOpen(false)
    setCode('')
    setError(null)
    onChanged()
  }

  if (hasToken) {
    return (
      <button type="button" className={linkClass} onClick={remove}>
        Remove Grok voice from this device
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={`${linkClass} text-left`} onClick={() => setOpen((current) => !current)}>
        Enter Grok voice code
      </button>
      {open ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void redeem()
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Access code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-10 cursor-pointer rounded-md bg-slate-800 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900"
          >
            {busy ? 'Checking…' : 'Use code'}
          </button>
          {error ? (
            <p className="text-xs text-red-700 dark:text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}
