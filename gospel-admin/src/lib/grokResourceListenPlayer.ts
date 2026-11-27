import { applyMemorizeListenPlaybackRateToMediaElement } from '@/lib/memorizeListenSpeedStorage'
import type { GospelListenSpeechEngine, GospelListenSpeechHandlers } from '@/lib/gospelListenSpeechEngine'
import type { GrokListenFailure } from '@/lib/grokListenFallback'
import {
  boundaryEventsFromGrokTimestamps,
  type GrokAudioTimestampTracks,
  type GrokListenBoundary,
} from '@/lib/grokListenTimestamps'

export type GrokTtsClientPayload = {
  audio: string
  contentType: string
  audioTimestamps?: GrokAudioTimestampTracks
}

type PreparedChunk = {
  url: string
  boundaries: GrokListenBoundary[]
}

export class GrokListenRequestError extends Error {
  readonly failure: GrokListenFailure

  constructor(failure: GrokListenFailure) {
    super('Grok listen failed')
    this.failure = failure
  }
}

function decodeAudio(base64: string, contentType: string): PreparedChunk {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: contentType || 'audio/mpeg' })
  if (typeof URL.createObjectURL !== 'function') {
    throw new GrokListenRequestError('network')
  }
  return { url: URL.createObjectURL(blob), boundaries: [] }
}

export async function fetchGrokTtsChunk(
  text: string,
  voiceId: string,
  withTimestamps: boolean
): Promise<PreparedChunk & { tracks?: GrokAudioTimestampTracks }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new GrokListenRequestError('offline')
  }
  let response: Response
  try {
    response = await fetch('/api/read-aloud/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId, withTimestamps }),
    })
  } catch {
    throw new GrokListenRequestError('network')
  }
  if (!response.ok) {
    throw new GrokListenRequestError(response.status)
  }
  let payload: GrokTtsClientPayload
  try {
    payload = (await response.json()) as GrokTtsClientPayload
  } catch {
    throw new GrokListenRequestError('network')
  }
  if (typeof payload.audio !== 'string' || !payload.audio) {
    throw new GrokListenRequestError('network')
  }
  const prepared = decodeAudio(payload.audio, payload.contentType || 'audio/mpeg')
  const tracks = payload.audioTimestamps
  prepared.boundaries = boundaryEventsFromGrokTimestamps(text, tracks)
  return prepared
}

type ListenSnapshot = { revision: number; speaking: boolean; paused: boolean }

const SERVER_SNAPSHOT: ListenSnapshot = { revision: 0, speaking: false, paused: false }

class GrokResourceListenPlayer implements GospelListenSpeechEngine {
  private voiceId = ''
  private withTimestamps = false
  private generation = 0
  private active = false
  private paused = false
  private audio: HTMLAudioElement | null = null
  private lastFailure: GrokListenFailure = 'network'
  private inflight = new Map<string, Promise<PreparedChunk>>()
  private revision = 0
  private snapshot: ListenSnapshot = SERVER_SNAPSHOT
  private listeners = new Set<() => void>()

  configure(options: { voiceId: string; withTimestamps: boolean }): void {
    this.voiceId = options.voiceId
    this.withTimestamps = options.withTimestamps
  }

  private cacheKey(text: string): string {
    return `${this.voiceId}\n${this.withTimestamps ? '1' : '0'}\n${text}`
  }

  prefetch(text: string): void {
    if (!text || !this.voiceId) return
    const key = this.cacheKey(text)
    if (this.inflight.has(key)) return
    const pending = fetchGrokTtsChunk(text, this.voiceId, this.withTimestamps).catch((error: unknown) => {
      this.inflight.delete(key)
      throw error
    })
    this.inflight.set(key, pending)
  }

  private revoke(url: string): void {
    try {
      URL.revokeObjectURL(url)
    } catch {
      return
    }
  }

  private stopElement(): void {
    const audio = this.audio
    this.audio = null
    if (!audio) return
    audio.onended = null
    audio.ontimeupdate = null
    audio.pause()
  }

  releaseAll(): void {
    this.generation += 1
    this.stopElement()
    const pending = [...this.inflight.values()]
    this.inflight.clear()
    for (const job of pending) {
      void job.then((prepared) => this.revoke(prepared.url)).catch(() => undefined)
    }
    this.active = false
    this.paused = false
    this.publish()
  }

  private publish(): void {
    this.revision += 1
    this.snapshot = { revision: this.revision, speaking: this.active, paused: this.paused && this.active }
    for (const listener of this.listeners) listener()
  }

  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange)
    return () => {
      this.listeners.delete(onChange)
    }
  }

  getSnapshot(): ListenSnapshot {
    const speaking = this.active
    const paused = this.paused && this.active
    if (
      this.snapshot.revision === this.revision &&
      this.snapshot.speaking === speaking &&
      this.snapshot.paused === paused
    ) {
      return this.snapshot
    }
    this.snapshot = { revision: this.revision, speaking, paused }
    return this.snapshot
  }

  consumeFailure(): GrokListenFailure {
    return this.lastFailure
  }

  isAvailable(): boolean {
    return true
  }

  speak(text: string, rate: number, handlers: GospelListenSpeechHandlers): void {
    const gen = ++this.generation
    this.stopElement()
    this.paused = false
    this.active = true
    this.publish()
    if (!text.trim()) {
      this.active = false
      this.publish()
      handlers.onend?.()
      return
    }
    this.prefetch(text)
    const key = this.cacheKey(text)
    const pending = this.inflight.get(key)
    if (!pending) {
      this.active = false
      this.lastFailure = 'network'
      this.publish()
      handlers.onerror?.()
      return
    }
    void pending
      .then((prepared) => {
        if (gen !== this.generation) return
        const audio = new Audio(prepared.url)
        this.audio = audio
        applyMemorizeListenPlaybackRateToMediaElement(audio, rate)
        let nextBoundary = 0
        const emitDue = () => {
          if (gen !== this.generation || this.paused) return
          while (nextBoundary < prepared.boundaries.length) {
            const boundary = prepared.boundaries[nextBoundary]!
            if (boundary.startSec > audio.currentTime + 0.03) break
            nextBoundary += 1
            handlers.onboundary?.(boundary)
          }
        }
        audio.ontimeupdate = emitDue
        audio.onended = () => {
          if (gen !== this.generation) return
          this.revoke(prepared.url)
          this.inflight.delete(key)
          this.audio = null
          this.active = false
          this.paused = false
          this.publish()
          handlers.onend?.()
        }
        const played = audio.play()
        if (played && typeof played.then === 'function') {
          void played
            .then(() => {
              if (gen !== this.generation) return
              handlers.onstart?.()
              emitDue()
            })
            .catch(() => {
              if (gen !== this.generation) return
              this.lastFailure = 'network'
              this.active = false
              this.publish()
              handlers.onerror?.()
            })
          return
        }
        handlers.onstart?.()
        emitDue()
      })
      .catch((error: unknown) => {
        if (gen !== this.generation) return
        this.lastFailure = error instanceof GrokListenRequestError ? error.failure : 'network'
        this.active = false
        this.paused = false
        this.publish()
        handlers.onerror?.()
      })
  }

  cancel(): void {
    this.generation += 1
    this.stopElement()
    this.active = false
    this.paused = false
    this.publish()
  }

  pause(): void {
    if (!this.audio || !this.active || this.paused) return
    this.audio.pause()
    this.paused = true
    this.publish()
  }

  resume(): void {
    if (!this.audio || !this.paused) return
    this.paused = false
    this.publish()
    void this.audio.play()
  }

  isSpeaking(): boolean {
    return this.active
  }

  isPaused(): boolean {
    return this.active && this.paused
  }

  resetForTests(): void {
    this.releaseAll()
    this.revision = 0
    this.snapshot = SERVER_SNAPSHOT
    this.voiceId = ''
    this.withTimestamps = false
    this.lastFailure = 'network'
  }
}

const player = new GrokResourceListenPlayer()

export function getGrokResourceListenPlayer(): GrokResourceListenPlayer {
  return player
}

export function subscribeGrokResourceListenPlayer(onChange: () => void): () => void {
  return player.subscribe(onChange)
}

export function getGrokResourceListenPlayerSnapshot(): ListenSnapshot {
  return player.getSnapshot()
}

export function getGrokResourceListenPlayerServerSnapshot(): ListenSnapshot {
  return SERVER_SNAPSHOT
}

export function resetGrokResourceListenPlayerForTests(): void {
  player.resetForTests()
}
