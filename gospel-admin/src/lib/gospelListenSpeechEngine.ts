import { Capacitor } from '@capacitor/core'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import { wordExtentAtChunkOffset } from '@/lib/readAlongSpeechWordRange'

/** Capacitor plugin id from `registerPlugin('SpeechSynthesis')`. */
export const CAPACITOR_SPEECH_SYNTHESIS_PLUGIN_ID = 'SpeechSynthesis'

export type GospelListenSpeechBoundaryEvent = {
  charIndex: number
  charLength?: number
}

export type GospelListenSpeechHandlers = {
  onstart?: () => void
  onend?: () => void
  onerror?: () => void
  onboundary?: (ev: GospelListenSpeechBoundaryEvent) => void
}

export type GospelListenSpeechEngine = {
  isAvailable: () => boolean
  speak: (text: string, rate: number, handlers: GospelListenSpeechHandlers) => void
  cancel: () => void
  pause: () => void
  resume: () => void
  isSpeaking: () => boolean
  isPaused: () => boolean
}

type ListenSpeechBackend = 'native-android' | 'web-speech' | 'none'

type NativeListenerHandle = { remove: () => Promise<void> }

function capacitorPluginAvailable(pluginId: string): boolean {
  try {
    const cap = Capacitor as { isPluginAvailable?: (id: string) => boolean }
    if (typeof cap.isPluginAvailable !== 'function') return false
    return cap.isPluginAvailable(pluginId)
  } catch {
    return false
  }
}

/** Native Android app with the speech plugin bundled (not Chrome-in-a-browser). */
export function shouldUseNativeAndroidListenSpeech(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === 'android' &&
      capacitorPluginAvailable(CAPACITOR_SPEECH_SYNTHESIS_PLUGIN_ID)
    )
  } catch {
    return false
  }
}

export function isWebSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function isNativeAndroidCapacitorHost(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

class ListenSpeechBackendResolver {
  private cached: ListenSpeechBackend | null = null

  resolve(): ListenSpeechBackend {
    if (shouldUseNativeAndroidListenSpeech()) return 'native-android'
    if (isNativeAndroidCapacitorHost()) return 'none'
    if (isWebSpeechSynthesisAvailable()) return 'web-speech'
    return 'none'
  }

  get(): ListenSpeechBackend {
    if (this.cached === null) {
      this.cached = this.resolve()
    }
    return this.cached
  }

  resetForTests(): void {
    this.cached = null
  }
}

/** Capgo native Android TTS session — generation counters and listener wiring live here. */
class NativeAndroidListenSpeechDriver {
  private listenersBound = false
  private listenersSetup: Promise<void> | null = null
  private currentId: string | null = null
  private handlers: GospelListenSpeechHandlers | null = null
  private sessionActive = false
  private paused = false
  private lastSpeak: { text: string; rate: number } | null = null
  /** Bumped on speak / pause / cancel so in-flight `speak()` and late `end` cannot attach to a new chunk. */
  private generation = 0
  /** `start` may arrive before `speak()` returns the utterance id. */
  private pendingStartId: string | null = null
  /** Offset into `lastSpeak.text` for the current native utterance (0 unless resuming after pause). */
  private resumeBase = 0
  /** Last `charIndex` from the current utterance’s `boundary` events (relative to the spoken slice). */
  private utteranceCharIndex = 0
  /** Web Speech `resume()` does not re-fire `onstart`; keep native resume the same so read-along does not jump. */
  private emitStart = true

  resetForTests(): void {
    this.listenersBound = false
    this.listenersSetup = null
    this.generation = 0
    this.clearSession()
  }

  speak(text: string, rate: number, handlers: GospelListenSpeechHandlers, isResume = false): void {
    const gen = ++this.generation
    this.paused = false
    this.sessionActive = true
    this.lastSpeak = { text, rate }
    this.handlers = handlers
    this.currentId = null
    this.pendingStartId = null
    this.utteranceCharIndex = 0
    this.emitStart = !isResume
    if (!isResume) this.resumeBase = 0
    const speakText = this.resumeBase > 0 ? text.slice(this.resumeBase) : text
    if (!speakText.trim()) {
      this.finishChunk(handlers)
      return
    }
    void (async () => {
      try {
        await this.ensureListeners()
        if (gen !== this.generation) return
        const clamped = Math.min(10, Math.max(0.1, rate))
        const result = await SpeechSynthesis.speak({
          text: speakText,
          language: 'en-US',
          rate: clamped,
          queueStrategy: 'Flush',
        })
        if (gen !== this.generation) return
        this.currentId = result.utteranceId
        if (this.pendingStartId === this.currentId) {
          this.applyStart(result.utteranceId)
        }
      } catch {
        if (gen !== this.generation) return
        this.clearSession()
        handlers.onerror?.()
      }
    })()
  }

  cancel(): void {
    this.generation += 1
    this.clearSession()
    void SpeechSynthesis.cancel()
  }

  pause(): void {
    if (!this.sessionActive || this.paused) return
    this.generation += 1
    this.paused = true
    if (this.lastSpeak) {
      this.resumeBase = wordExtentAtChunkOffset(
        this.lastSpeak.text,
        this.resumeBase + this.utteranceCharIndex
      ).start
      this.utteranceCharIndex = 0
    }
    this.currentId = null
    this.pendingStartId = null
    void SpeechSynthesis.cancel()
  }

  resume(): void {
    if (!this.paused || !this.lastSpeak || !this.handlers) return
    const { text, rate } = this.lastSpeak
    const handlers = this.handlers
    this.speak(text, rate, handlers, true)
  }

  isSpeaking(): boolean {
    return this.sessionActive
  }

  isPaused(): boolean {
    return this.paused
  }

  private eventMatches(utteranceId: string | undefined): boolean {
    if (!this.currentId || !utteranceId) return false
    return utteranceId === this.currentId
  }

  private clearSession(): void {
    this.sessionActive = false
    this.paused = false
    this.lastSpeak = null
    this.handlers = null
    this.currentId = null
    this.pendingStartId = null
    this.resumeBase = 0
    this.utteranceCharIndex = 0
    this.emitStart = true
  }

  private finishChunk(handlers: GospelListenSpeechHandlers): void {
    this.clearSession()
    handlers.onend?.()
  }

  private applyStart(utteranceId: string): void {
    if (!this.eventMatches(utteranceId)) return
    this.pendingStartId = null
    this.paused = false
    if (this.emitStart) this.handlers?.onstart?.()
  }

  private async removeListenerHandles(handles: NativeListenerHandle[]): Promise<void> {
    await Promise.all(
      handles.map((handle) =>
        handle.remove().catch(() => {
          /* ignore so a failed bind can retry */
        })
      )
    )
  }

  private async bindListeners(): Promise<void> {
    const handles: NativeListenerHandle[] = []
    try {
      handles.push(
        await SpeechSynthesis.addListener('start', (event) => {
          if (this.eventMatches(event.utteranceId)) {
            this.applyStart(event.utteranceId)
            return
          }
          if (event.utteranceId) this.pendingStartId = event.utteranceId
        })
      )
      handles.push(
        await SpeechSynthesis.addListener('end', (event) => {
          if (!this.eventMatches(event.utteranceId)) return
          const handlers = this.handlers
          this.clearSession()
          handlers?.onend?.()
        })
      )
      handles.push(
        await SpeechSynthesis.addListener('boundary', (event) => {
          if (!this.eventMatches(event.utteranceId)) return
          if (this.paused) return
          this.utteranceCharIndex = typeof event.charIndex === 'number' ? event.charIndex : 0
          this.handlers?.onboundary?.({
            charIndex: this.resumeBase + this.utteranceCharIndex,
            charLength: event.charLength,
          })
        })
      )
      handles.push(
        await SpeechSynthesis.addListener('error', (event) => {
          if (!this.eventMatches(event.utteranceId)) return
          const handlers = this.handlers
          this.clearSession()
          handlers?.onerror?.()
        })
      )
      this.listenersBound = true
    } catch (err) {
      this.listenersBound = false
      await this.removeListenerHandles(handles)
      throw err
    }
  }

  private async ensureListeners(): Promise<void> {
    if (this.listenersBound) return
    let pending = this.listenersSetup
    if (!pending) {
      pending = this.bindListeners().finally(() => {
        if (this.listenersSetup === pending) this.listenersSetup = null
      })
      this.listenersSetup = pending
    }
    await pending
  }
}

const webListenSpeechDriver = {
  speak(text: string, rate: number, handlers: GospelListenSpeechHandlers): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      handlers.onerror?.()
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = rate
    u.onstart = () => handlers.onstart?.()
    u.onend = () => handlers.onend?.()
    u.onerror = () => handlers.onerror?.()
    u.onboundary = (ev: SpeechSynthesisEvent) => {
      handlers.onboundary?.({
        charIndex: typeof ev.charIndex === 'number' ? ev.charIndex : 0,
        charLength: typeof ev.charLength === 'number' ? ev.charLength : undefined,
      })
    }
    window.speechSynthesis.speak(u)
  },
  cancel(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  },
  pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
    }
  },
  resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
  },
  isSpeaking(): boolean {
    return typeof window !== 'undefined' && !!window.speechSynthesis?.speaking
  },
  isPaused(): boolean {
    return typeof window !== 'undefined' && !!window.speechSynthesis?.paused
  },
}

const backendResolver = new ListenSpeechBackendResolver()
const nativeAndroidDriver = new NativeAndroidListenSpeechDriver()

/** True when gospel Listen can speak: native Android plugin, or Web Speech. */
export function isGospelListenSpeechAvailable(): boolean {
  return backendResolver.get() !== 'none'
}

/**
 * When false, profile pages omit the header **Listen** control and related help tours.
 * Non-Android: always shown. Android Chrome: shown when Web Speech exists. Native Android:
 * shown only when the Capacitor speech plugin is present (old APKs stay hidden).
 */
export function isGospelListenUiAvailable(): boolean {
  if (typeof window === 'undefined') return true
  if (!isMemorizeAndroidWebHost()) return true
  return isGospelListenSpeechAvailable()
}

export type GospelListenSpeechEngineSnapshot = {
  revision: number
  speaking: boolean
  paused: boolean
}

let engineRevision = 0
const engineStateListeners = new Set<() => void>()
let cachedEngineSnapshot: GospelListenSpeechEngineSnapshot = {
  revision: 0,
  speaking: false,
  paused: false,
}

function publishEngineState(): void {
  engineRevision += 1
  for (const listener of engineStateListeners) {
    listener()
  }
}

function readEnginePlaybackState(): Pick<GospelListenSpeechEngineSnapshot, 'speaking' | 'paused'> {
  const backend = backendResolver.get()
  switch (backend) {
    case 'native-android':
      return {
        speaking: nativeAndroidDriver.isSpeaking(),
        paused: nativeAndroidDriver.isPaused(),
      }
    case 'web-speech':
      return {
        speaking: webListenSpeechDriver.isSpeaking(),
        paused: webListenSpeechDriver.isPaused(),
      }
    case 'none':
      return { speaking: false, paused: false }
    default: {
      const _exhaustive: never = backend
      return _exhaustive
    }
  }
}

export function subscribeGospelListenSpeechEngine(onStoreChange: () => void): () => void {
  engineStateListeners.add(onStoreChange)
  return () => {
    engineStateListeners.delete(onStoreChange)
  }
}

export function getGospelListenSpeechEngineSnapshot(): GospelListenSpeechEngineSnapshot {
  const { speaking, paused } = readEnginePlaybackState()
  if (
    cachedEngineSnapshot.revision === engineRevision &&
    cachedEngineSnapshot.speaking === speaking &&
    cachedEngineSnapshot.paused === paused
  ) {
    return cachedEngineSnapshot
  }
  cachedEngineSnapshot = { revision: engineRevision, speaking, paused }
  return cachedEngineSnapshot
}

export function getGospelListenSpeechEngineServerSnapshot(): GospelListenSpeechEngineSnapshot {
  return { revision: 0, speaking: false, paused: false }
}

function wrapGospelListenSpeechHandlers(
  handlers: GospelListenSpeechHandlers
): GospelListenSpeechHandlers {
  return {
    onstart: () => {
      publishEngineState()
      handlers.onstart?.()
    },
    onend: () => {
      publishEngineState()
      handlers.onend?.()
    },
    onerror: () => {
      publishEngineState()
      handlers.onerror?.()
    },
    onboundary: handlers.onboundary,
  }
}

const engine: GospelListenSpeechEngine = {
  isAvailable: () => isGospelListenSpeechAvailable(),
  speak(text, rate, handlers) {
    publishEngineState()
    const wrapped = wrapGospelListenSpeechHandlers(handlers)
    const backend = backendResolver.get()
    switch (backend) {
      case 'native-android':
        nativeAndroidDriver.speak(text, rate, wrapped)
        break
      case 'web-speech':
        webListenSpeechDriver.speak(text, rate, wrapped)
        break
      case 'none':
        wrapped.onerror?.()
        break
      default: {
        const _exhaustive: never = backend
        return _exhaustive
      }
    }
  },
  cancel() {
    const backend = backendResolver.get()
    if (backend === 'native-android') {
      nativeAndroidDriver.cancel()
    } else if (backend === 'web-speech') {
      webListenSpeechDriver.cancel()
    }
    publishEngineState()
  },
  pause() {
    const backend = backendResolver.get()
    switch (backend) {
      case 'native-android':
        nativeAndroidDriver.pause()
        break
      case 'web-speech':
        webListenSpeechDriver.pause()
        break
      case 'none':
        break
      default: {
        const _exhaustive: never = backend
        return _exhaustive
      }
    }
    publishEngineState()
  },
  resume() {
    const backend = backendResolver.get()
    switch (backend) {
      case 'native-android':
        nativeAndroidDriver.resume()
        break
      case 'web-speech':
        webListenSpeechDriver.resume()
        break
      case 'none':
        break
      default: {
        const _exhaustive: never = backend
        return _exhaustive
      }
    }
    publishEngineState()
  },
  isSpeaking() {
    const backend = backendResolver.get()
    switch (backend) {
      case 'native-android':
        return nativeAndroidDriver.isSpeaking()
      case 'web-speech':
        return webListenSpeechDriver.isSpeaking()
      case 'none':
        return false
      default: {
        const _exhaustive: never = backend
        return _exhaustive
      }
    }
  },
  isPaused() {
    const backend = backendResolver.get()
    switch (backend) {
      case 'native-android':
        return nativeAndroidDriver.isPaused()
      case 'web-speech':
        return webListenSpeechDriver.isPaused()
      case 'none':
        return false
      default: {
        const _exhaustive: never = backend
        return _exhaustive
      }
    }
  },
}

export function getGospelListenSpeechEngine(): GospelListenSpeechEngine {
  return engine
}

/** Test-only: clear backend cache and native listener + session state. */
export function resetGospelListenSpeechEngineForTests(): void {
  backendResolver.resetForTests()
  nativeAndroidDriver.resetForTests()
  engineRevision = 0
  cachedEngineSnapshot = { revision: 0, speaking: false, paused: false }
}
