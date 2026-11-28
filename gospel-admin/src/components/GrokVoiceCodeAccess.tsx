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

const menuButtonClass =
  'w-full min-h-12.5 px-4 py-3 rounded-lg font-medium text-center text-sm sm:text-base transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60'

const removeLinkClass =
  'cursor-pointer self-start text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline-offset-2 hover:underline'

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
      <button type="button" className={removeLinkClass} onClick={remove}>
        Remove Grok voice from this device
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className={`${linkClass} text-left`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Enter code
      </button>
      {open ? (
        <form
          className="flex flex-col gap-3"
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
              className="h-10 rounded-md border border-slate-300 bg-white px-2 text-base sm:text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className={menuButtonClass}
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
