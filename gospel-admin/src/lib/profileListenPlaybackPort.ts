import type { MutableRefObject } from 'react'
import {
  getGospelListenSpeechEngine,
  getGospelListenSpeechEngineServerSnapshot,
  getGospelListenSpeechEngineSnapshot,
  isGospelListenSpeechAvailable,
  subscribeGospelListenSpeechEngine,
  type GospelListenSpeechEngine,
} from '@/lib/gospelListenSpeechEngine'
import {
  getGrokResourceListenPlayer,
  getGrokResourceListenPlayerServerSnapshot,
  getGrokResourceListenPlayerSnapshot,
  subscribeGrokResourceListenPlayer,
} from '@/lib/grokResourceListenPlayer'
import { DEVICE_LISTEN_VOICE_ID } from '@/lib/resourceListenVoiceStorage'

export type ListenEnginePlaybackSnapshot = {
  revision: number
  speaking: boolean
  paused: boolean
}

export type ListenEnginePort = {
  isAvailable: () => boolean
  getEngine: () => GospelListenSpeechEngine
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => ListenEnginePlaybackSnapshot
  getServerSnapshot: () => ListenEnginePlaybackSnapshot
}

export function profileListenUsesGrok(
  voiceRef: MutableRefObject<string> | undefined,
  fallbackRef: MutableRefObject<boolean>
): boolean {
  if (!voiceRef || fallbackRef.current) return false
  return voiceRef.current !== DEVICE_LISTEN_VOICE_ID
}

export function createProfileListenPlaybackPort(usesGrok: boolean): ListenEnginePort {
  return {
    isAvailable() {
      return usesGrok || isGospelListenSpeechAvailable()
    },
    getEngine() {
      return usesGrok ? getGrokResourceListenPlayer() : getGospelListenSpeechEngine()
    },
    subscribe(onChange) {
      const stopSpeech = subscribeGospelListenSpeechEngine(onChange)
      const stopGrok = subscribeGrokResourceListenPlayer(onChange)
      return () => {
        stopSpeech()
        stopGrok()
      }
    },
    getSnapshot() {
      return usesGrok ? getGrokResourceListenPlayerSnapshot() : getGospelListenSpeechEngineSnapshot()
    },
    getServerSnapshot() {
      return usesGrok
        ? getGrokResourceListenPlayerServerSnapshot()
        : getGospelListenSpeechEngineServerSnapshot()
    },
  }
}
