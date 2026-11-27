'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { groupGrokVoices, type GrokVoice } from '@/lib/grokTtsVoices'
import { DEVICE_LISTEN_VOICE_ID } from '@/lib/resourceListenVoiceStorage'

export const GROK_VOICE_PREVIEW_TEXT = 'The Lord is my shepherd; I shall not want.'

const triggerButtonClass =
  'inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 transition-colors cursor-pointer ' +
  'hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 h-10'

const optionButtonClass =
  'flex min-h-[38px] min-w-0 flex-1 items-center rounded-md px-2 text-left text-sm font-medium transition-colors cursor-pointer ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'

const selectedOptionClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
const idleOptionClass = 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'

const previewButtonClass =
  'inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors cursor-pointer ' +
  'hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'

export interface ResourceListenGrokVoicePickerProps {
  voices: GrokVoice[]
  value: string
  onChange: (voiceId: string) => void
}

function previewErrorMessage(status: number): string {
  if (status === 429) return 'Preview is busy. Try again in a moment.'
  if (status === 503) return 'Grok voice is not available right now.'
  return 'Could not play that preview.'
}

function revokeUrl(url: string): void {
  if (typeof URL.revokeObjectURL !== 'function') return
  URL.revokeObjectURL(url)
}

function audioUrlFromBase64(base64: string, contentType: string): string | null {
  if (typeof URL.createObjectURL !== 'function') return null
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: contentType || 'audio/mpeg' }))
}

export function ResourceListenGrokVoicePicker({
  voices,
  value,
  onChange,
}: ResourceListenGrokVoicePickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const generationRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const groups = groupGrokVoices(voices)
  const selected = voices.find((voice) => voice.voiceId === value)
  const triggerLabel = value === DEVICE_LISTEN_VOICE_ID ? 'This device' : (selected?.name ?? value)
  const unmatched =
    value !== DEVICE_LISTEN_VOICE_ID && !selected
      ? { voiceId: value, name: value, gender: null }
      : null

  const releaseAudio = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) {
      revokeUrl(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const stopPreview = useCallback(() => {
    generationRef.current += 1
    releaseAudio()
    setPlayingId(null)
  }, [releaseAudio])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      audioRef.current?.pause()
      audioRef.current = null
      if (urlRef.current) {
        revokeUrl(urlRef.current)
        urlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
      stopPreview()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      stopPreview()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, stopPreview])

  const choose = (voiceId: string) => {
    onChange(voiceId)
    setOpen(false)
    stopPreview()
  }

  const preview = async (voiceId: string) => {
    if (playingId === voiceId) {
      stopPreview()
      return
    }
    const generation = generationRef.current + 1
    generationRef.current = generation
    releaseAudio()
    setPlayingId(null)
    setPreviewError(null)
    try {
      const response = await fetch('/api/read-aloud/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: GROK_VOICE_PREVIEW_TEXT,
          voiceId,
          withTimestamps: false,
        }),
      })
      if (generation !== generationRef.current) return
      if (!response.ok) {
        setPreviewError(previewErrorMessage(response.status))
        return
      }
      const payload = (await response.json()) as { audio?: unknown; contentType?: unknown }
      if (generation !== generationRef.current) return
      if (typeof payload.audio !== 'string' || !payload.audio) {
        setPreviewError(previewErrorMessage(502))
        return
      }
      const url = audioUrlFromBase64(
        payload.audio,
        typeof payload.contentType === 'string' ? payload.contentType : 'audio/mpeg'
      )
      if (!url) {
        setPreviewError(previewErrorMessage(502))
        return
      }
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        if (generation !== generationRef.current) return
        releaseAudio()
        setPlayingId(null)
      }
      setPlayingId(voiceId)
      await audio.play()
    } catch {
      if (generation !== generationRef.current) return
      releaseAudio()
      setPlayingId(null)
      setPreviewError(previewErrorMessage(502))
    }
  }

  const renderVoice = (voice: GrokVoice) => {
    const selectedVoice = voice.voiceId === value
    const playing = playingId === voice.voiceId
    return (
      <div key={voice.voiceId} className="flex items-stretch gap-1">
        <button
          type="button"
          role="option"
          aria-selected={selectedVoice}
          data-testid={`resource-listen-voice-option-${voice.voiceId}`}
          className={`${optionButtonClass} ${selectedVoice ? selectedOptionClass : idleOptionClass}`}
          onClick={() => choose(voice.voiceId)}
        >
          <span className="truncate">{voice.name}</span>
        </button>
        <button
          type="button"
          data-testid={`resource-listen-voice-preview-${voice.voiceId}`}
          className={previewButtonClass}
          aria-label={playing ? `Stop preview of ${voice.name}` : `Preview ${voice.name}`}
          onClick={() => {
            void preview(voice.voiceId)
          }}
        >
          {playing ? <StopGlyph /> : <PlayGlyph />}
        </button>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Voice</span>
      <button
        type="button"
        data-testid="resource-listen-voice"
        className={triggerButtonClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (open) stopPreview()
          setOpen(!open)
        }}
      >
        <span className="truncate">{triggerLabel}</span>
        <svg aria-hidden className={`h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400 ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m6 8 4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Listen voice"
          className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === DEVICE_LISTEN_VOICE_ID}
            data-testid="resource-listen-voice-option-device"
            className={`${optionButtonClass} ${value === DEVICE_LISTEN_VOICE_ID ? selectedOptionClass : idleOptionClass}`}
            onClick={() => choose(DEVICE_LISTEN_VOICE_ID)}
          >
            This device
          </button>
          {unmatched ? renderVoice(unmatched) : null}
          <VoiceSection title="Female" voices={groups.female} renderVoice={renderVoice} />
          <VoiceSection title="Male" voices={groups.male} renderVoice={renderVoice} />
          <VoiceSection title="Other" voices={groups.other} renderVoice={renderVoice} />
          {previewError ? (
            <p data-testid="resource-listen-voice-preview-error" className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300" role="status">
              {previewError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function VoiceSection({
  title,
  voices,
  renderVoice,
}: {
  title: string
  voices: GrokVoice[]
  renderVoice: (voice: GrokVoice) => ReactNode
}) {
  if (voices.length === 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      {voices.map(renderVoice)}
    </div>
  )
}

function PlayGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <polygon points="8 5 19 12 8 19" />
    </svg>
  )
}

function StopGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}
