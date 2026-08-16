import { Capacitor } from '@capacitor/core'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'

/** Capacitor plugin id from `registerPlugin('SpeechSynthesis')`. */
export const CAPACITOR_SPEECH_SYNTHESIS_PLUGIN_ID = 'SpeechSynthesis'

export type ProfileReadAloudSpeechBoundaryEvent = {
  charIndex: number
  charLength?: number
}

export type ProfileReadAloudSpeechHandlers = {
  onstart?: () => void
  onend?: () => void
  onerror?: () => void
  onboundary?: (ev: ProfileReadAloudSpeechBoundaryEvent) => void
}

export type ProfileReadAloudSpeechEngine = {
  isAvailable: () => boolean
  speak: (text: string, rate: number, handlers: ProfileReadAloudSpeechHandlers) => void
  cancel: () => void
  pause: () => void
  resume: () => void
  isSpeaking: () => boolean
  isPaused: () => boolean
}

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
export function shouldUseNativeAndroidReadAloudSpeech(): boolean {
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

/** True when profile Listen can speak: native Android plugin, or Web Speech. */
export function isProfileReadAloudSpeechAvailable(): boolean {
  if (shouldUseNativeAndroidReadAloudSpeech()) return true
  if (isNativeAndroidCapacitorHost()) return false
  return isWebSpeechSynthesisAvailable()
}

type NativeListenerHandle = { remove: () => Promise<void> }

let nativeListenersBound = false
let nativeListenersSetup: Promise<void> | null = null
let nativeCurrentId: string | null = null
let nativeHandlers: ProfileReadAloudSpeechHandlers | null = null
let nativeSessionActive = false
let nativePaused = false
let nativeLastSpeak: { text: string; rate: number } | null = null
/** Bumped on speak / pause / cancel so in-flight `speak()` and late `end` cannot attach to a new chunk. */
let nativeGeneration = 0
/** `start` may arrive before `speak()` returns the utterance id. */
let nativePendingStartId: string | null = null
/** Offset into `nativeLastSpeak.text` for the current native utterance (0 unless resuming after pause). */
let nativeResumeBase = 0
/** Last `charIndex` from the current utterance’s `boundary` events (relative to the spoken slice). */
let nativeUtteranceCharIndex = 0
/** Web Speech `resume()` does not re-fire `onstart`; keep native resume the same so read-along does not jump. */
let nativeEmitStart = true

function nativeEventMatches(utteranceId: string | undefined): boolean {
  if (!nativeCurrentId || !utteranceId) return false
  return utteranceId === nativeCurrentId
}

/** Snap to the start of the token containing `charIndex` so resume does not speak a word fragment. */
export function nativeReadAloudResumeOffset(text: string, charIndex: number): number {
  const len = text.length
  if (len === 0) return 0
  let i = Math.max(0, Math.min(charIndex, len))
  while (i > 0 && /\S/.test(text.charAt(i - 1))) i -= 1
  while (i < len && /\s/.test(text.charAt(i))) i += 1
  return i
}

function clearNativeSession(): void {
  nativeSessionActive = false
  nativePaused = false
  nativeLastSpeak = null
  nativeHandlers = null
  nativeCurrentId = null
  nativePendingStartId = null
  nativeResumeBase = 0
  nativeUtteranceCharIndex = 0
  nativeEmitStart = true
}

function applyNativeStart(utteranceId: string): void {
  if (!nativeEventMatches(utteranceId)) return
  nativePendingStartId = null
  nativePaused = false
  if (nativeEmitStart) nativeHandlers?.onstart?.()
}

async function removeNativeListenerHandles(handles: NativeListenerHandle[]): Promise<void> {
  await Promise.all(
    handles.map((handle) =>
      handle.remove().catch(() => {
        /* ignore so a failed bind can retry */
      })
    )
  )
}

async function bindNativeListeners(): Promise<void> {
  const handles: NativeListenerHandle[] = []
  try {
    handles.push(
      await SpeechSynthesis.addListener('start', (event) => {
        if (nativeEventMatches(event.utteranceId)) {
          applyNativeStart(event.utteranceId)
          return
        }
        if (event.utteranceId) nativePendingStartId = event.utteranceId
      })
    )
    handles.push(
      await SpeechSynthesis.addListener('end', (event) => {
        if (!nativeEventMatches(event.utteranceId)) return
        const handlers = nativeHandlers
        clearNativeSession()
        handlers?.onend?.()
      })
    )
    handles.push(
      await SpeechSynthesis.addListener('boundary', (event) => {
        if (!nativeEventMatches(event.utteranceId)) return
        if (nativePaused) return
        nativeUtteranceCharIndex = typeof event.charIndex === 'number' ? event.charIndex : 0
        nativeHandlers?.onboundary?.({
          charIndex: nativeResumeBase + nativeUtteranceCharIndex,
          charLength: event.charLength,
        })
      })
    )
    handles.push(
      await SpeechSynthesis.addListener('error', (event) => {
        if (!nativeEventMatches(event.utteranceId)) return
        const handlers = nativeHandlers
        clearNativeSession()
        handlers?.onerror?.()
      })
    )
    nativeListenersBound = true
  } catch (err) {
    nativeListenersBound = false
    await removeNativeListenerHandles(handles)
    throw err
  }
}

async function ensureNativeListeners(): Promise<void> {
  if (nativeListenersBound) return
  let pending = nativeListenersSetup
  if (!pending) {
    pending = bindNativeListeners().finally(() => {
      if (nativeListenersSetup === pending) nativeListenersSetup = null
    })
    nativeListenersSetup = pending
  }
  await pending
}

function finishNativeChunk(handlers: ProfileReadAloudSpeechHandlers): void {
  clearNativeSession()
  handlers.onend?.()
}

function speakNative(
  text: string,
  rate: number,
  handlers: ProfileReadAloudSpeechHandlers,
  isResume = false
): void {
  const gen = ++nativeGeneration
  nativePaused = false
  nativeSessionActive = true
  nativeLastSpeak = { text, rate }
  nativeHandlers = handlers
  nativeCurrentId = null
  nativePendingStartId = null
  nativeUtteranceCharIndex = 0
  nativeEmitStart = !isResume
  if (!isResume) nativeResumeBase = 0
  const speakText = nativeResumeBase > 0 ? text.slice(nativeResumeBase) : text
  if (!speakText.trim()) {
    finishNativeChunk(handlers)
    return
  }
  void (async () => {
    try {
      await ensureNativeListeners()
      if (gen !== nativeGeneration) return
      const clamped = Math.min(10, Math.max(0.1, rate))
      const result = await SpeechSynthesis.speak({
        text: speakText,
        language: 'en-US',
        rate: clamped,
        queueStrategy: 'Flush',
      })
      if (gen !== nativeGeneration) return
      nativeCurrentId = result.utteranceId
      if (nativePendingStartId === nativeCurrentId) {
        applyNativeStart(result.utteranceId)
      }
    } catch {
      if (gen !== nativeGeneration) return
      clearNativeSession()
      handlers.onerror?.()
    }
  })()
}

function cancelNative(): void {
  nativeGeneration += 1
  clearNativeSession()
  void SpeechSynthesis.cancel()
}

function pauseNative(): void {
  if (!nativeSessionActive || nativePaused) return
  nativeGeneration += 1
  nativePaused = true
  if (nativeLastSpeak) {
    nativeResumeBase = nativeReadAloudResumeOffset(
      nativeLastSpeak.text,
      nativeResumeBase + nativeUtteranceCharIndex
    )
    nativeUtteranceCharIndex = 0
  }
  nativeCurrentId = null
  nativePendingStartId = null
  void SpeechSynthesis.cancel()
}

function resumeNative(): void {
  if (!nativePaused || !nativeLastSpeak || !nativeHandlers) return
  const { text, rate } = nativeLastSpeak
  const handlers = nativeHandlers
  speakNative(text, rate, handlers, true)
}

function speakWeb(text: string, rate: number, handlers: ProfileReadAloudSpeechHandlers): void {
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
}

function cancelWeb(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

const engine: ProfileReadAloudSpeechEngine = {
  isAvailable: () => isProfileReadAloudSpeechAvailable(),
  speak(text, rate, handlers) {
    if (shouldUseNativeAndroidReadAloudSpeech()) {
      speakNative(text, rate, handlers)
      return
    }
    speakWeb(text, rate, handlers)
  },
  cancel() {
    if (shouldUseNativeAndroidReadAloudSpeech()) {
      cancelNative()
    }
    cancelWeb()
  },
  pause() {
    if (shouldUseNativeAndroidReadAloudSpeech()) {
      pauseNative()
      return
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
    }
  },
  resume() {
    if (shouldUseNativeAndroidReadAloudSpeech()) {
      resumeNative()
      return
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
  },
  isSpeaking() {
    if (shouldUseNativeAndroidReadAloudSpeech()) {
      return nativeSessionActive
    }
    return typeof window !== 'undefined' && !!window.speechSynthesis?.speaking
  },
  isPaused() {
    if (shouldUseNativeAndroidReadAloudSpeech()) {
      return nativePaused
    }
    return typeof window !== 'undefined' && !!window.speechSynthesis?.paused
  },
}

export function getProfileReadAloudSpeechEngine(): ProfileReadAloudSpeechEngine {
  return engine
}

/** Stop Web Speech and native Android TTS (shared queue with memorize Listen). */
export const GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT = 'gospel-profile-read-aloud-cancelled'

export function cancelProfileReadAloudSpeech(): void {
  engine.cancel()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT))
  }
}

/** Test-only: clear native listener + session state. */
export function resetProfileReadAloudSpeechEngineForTests(): void {
  nativeListenersBound = false
  nativeListenersSetup = null
  nativeGeneration = 0
  clearNativeSession()
}
