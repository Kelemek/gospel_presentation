import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import type { SpeechRecognitionPartialResultEvent } from '@capgo/capacitor-speech-recognition'
import logger from '@/lib/logger'

const SPEECH_PLUGIN = 'SpeechRecognition' as const

/** Matches {@link startVoicePtt} / practice content (English). */
const MEMORIZE_SPEECH_LANGUAGE = 'en-US'

type CapgoSpeech = typeof import('@capgo/capacitor-speech-recognition')
type CapgoPlugin = CapgoSpeech['SpeechRecognition']

let speechModulePromise: Promise<CapgoSpeech> | null = null
/** Cached after first dynamic import. Never *return* this from an `async` function — the Capacitor proxy is thenable and breaks `Promise` assimilation. */
let speechPlugin: CapgoPlugin | null = null
/** Single in-flight load so concurrent callers do not double-assign. */
let speechLoadPromise: Promise<void> | null = null

function loadSpeechModule(): Promise<CapgoSpeech> {
  if (!speechModulePromise) {
    speechModulePromise = import('@capgo/capacitor-speech-recognition')
  }
  return speechModulePromise
}

/**
 * Load the plugin once. Do not return the plugin from any `async` function — the Capacitor `SpeechRecognition`
 * proxy advertises a `then` key, so `return plugin` in `async` triggers Promise assimilation and calls
 * `…then()` on the native plugin (error on iOS).
 */
async function ensureSpeechPluginLoaded(): Promise<void> {
  if (speechPlugin) return
  if (!speechLoadPromise) {
    speechLoadPromise = loadSpeechModule().then((m) => {
      speechPlugin = m.SpeechRecognition
    })
  }
  await speechLoadPromise
}

function getSpeechPlugin(): CapgoPlugin {
  if (!speechPlugin) {
    throw new Error('memorizeNativeSpeech: call await ensureSpeechPluginLoaded() first')
  }
  return speechPlugin
}

type WithLanguageInAvailable = {
  /** iOS `SFSpeechRecognizer` — native reads `language`; public `.d.ts` omits the parameter. */
  available: (options?: { language?: string }) => Promise<{ available: boolean }>
}

/**
 * iOS: `SFSpeechRecognizer` must be checked per locale. We match `start()`'s `en-US`, then fall back to
 * the device default (the native `available` call with no `language` uses `Locale.current`).
 * Android: the plugin ignores `language` in `available()`; still safe to pass.
 */
async function isRecognizerAvailableForMemorize(plugin: CapgoPlugin): Promise<boolean> {
  const s = plugin as unknown as WithLanguageInAvailable
  const en = await s.available({ language: MEMORIZE_SPEECH_LANGUAGE })
  if (en.available) return true
  const def = await s.available()
  return def.available
}

/**
 * True when running in the Capacitor native shell; speech UI should only be offered then.
 */
export function isMemorizeNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * True when the *native binary* was built with the Capgo speech plugin linked (see Capacitor `PluginHeaders`).
 * If false, JS will throw "plugin is not implemented on ios" — fix with `npx cap sync` and a clean app rebuild.
 */
export function isMemorizeSpeechPluginInNativeBuild(): boolean {
  if (!isMemorizeNativeApp()) return false
  return Capacitor.isPluginAvailable(SPEECH_PLUGIN)
}

export async function isMemorizeSpeechAvailable(): Promise<boolean> {
  if (!isMemorizeNativeApp()) return false
  if (!Capacitor.isPluginAvailable(SPEECH_PLUGIN)) return false
  try {
    await ensureSpeechPluginLoaded()
    return await isRecognizerAvailableForMemorize(getSpeechPlugin())
  } catch (e) {
    logger.warn('Memorize speech: availability check failed', e)
    return false
  }
}

/**
 * @returns `true` if speech (and mic) can be used.
 */
export async function requestMemorizeSpeechPermissions(): Promise<boolean> {
  if (!isMemorizeNativeApp()) return false
  if (!Capacitor.isPluginAvailable(SPEECH_PLUGIN)) return false
  try {
    await ensureSpeechPluginLoaded()
    const s = await getSpeechPlugin().requestPermissions()
    return s.speechRecognition === 'granted'
  } catch {
    return false
  }
}

export type VoicePttController = {
  stop: () => Promise<void>
}

/**
 * With `continuousPTT`, the native layer often sends the current segment in `matches[0]`
 * and prior segments in `accumulated`, or a combined `accumulatedText`. Using `matches[0]`
 * alone would drop earlier words and block completing the verse until release.
 */
/**
 * When both `accumulated` and `matches[0]` are set, the plugin may send the **same** text twice
 * (e.g. full segment in both fields), or one as a prefix of the other. Blunt concatenation
 * duplicated phrases and derailed the verse (e.g. ref / tail garbage).
 */
function mergeAccumulatedAndMatch(accumulated: string, match: string): string {
  const a = accumulated.trim()
  const b = match.trim()
  if (!a) return b
  if (!b) return a
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  if (bl.length >= al.length && bl.startsWith(al)) return b
  if (al.length >= bl.length && al.startsWith(bl)) return a
  return `${a} ${b}`.trim()
}

export function transcriptTextFromPartialEvent(ev: SpeechRecognitionPartialResultEvent): string {
  const at = (ev.accumulatedText ?? '').trim()
  if (at) return at

  const acc = (ev.accumulated ?? '').trim()
  const m0 = (ev.matches?.[0] ?? '').trim()
  if (acc && m0) return mergeAccumulatedAndMatch(acc, m0)
  if (m0) return m0
  return acc
}

/**
 * Voice session: tap to start, tap again to stop. Calls `onPartial` with the latest transcript; may repeat.
 */
export async function startVoicePtt(
  onPartial: (transcript: string) => void,
  onError: (message: string) => void
): Promise<VoicePttController> {
  if (!isMemorizeNativeApp() || !Capacitor.isPluginAvailable(SPEECH_PLUGIN)) {
    onError(
      'This app build is missing the speech module. From gospel-admin run npx cap sync, then clean rebuild and reinstall the iOS or Android app.'
    )
    throw new Error('SPEECH_RECOGNITION_NOT_IN_NATIVE_BUILD')
  }
  await ensureSpeechPluginLoaded()
  const plugin = getSpeechPlugin()
  const handles: PluginListenerHandle[] = []

  const hPart = await plugin.addListener('partialResults', (ev) => {
    onPartial(transcriptTextFromPartialEvent(ev ?? ({} as SpeechRecognitionPartialResultEvent)))
  })
  handles.push(hPart)
  const hErr = await plugin.addListener('error', (ev) => {
    onError(ev.message || ev.code)
  })
  handles.push(hErr)

  await plugin.start({
    language: MEMORIZE_SPEECH_LANGUAGE,
    partialResults: true,
    continuousPTT: true,
    /* Avoid OS popup on Android; use inline + PTT. */
    popup: false,
  })
  await plugin.setPTTState({ held: true })

  return {
    stop: async () => {
      try {
        await plugin.setPTTState({ held: false })
        await plugin.stop()
      } catch {
        // best-effort
      }
      try {
        const last = await plugin.getLastPartialResult()
        const t = (last.text ?? '').trim()
        if (last.available && t) onPartial(t)
      } catch {
        // best-effort
      }
      for (const h of handles) {
        try {
          await h.remove()
        } catch {
          // empty
        }
      }
    },
  }
}
