import { cancelProfileReadAloudSpeech } from '@/lib/profileReadAloudSpeechEngine'

/**
 * Profile Listen shares the speech queue with memorize Listen and Bible Reader chapter audio
 * (Web Speech and native Android TTS). Dispatch this so profile read-aloud fully stops and
 * cannot steal pause/resume.
 */
export const GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT = 'gospel-web-speech-exclusive-owner'

export type GospelWebSpeechExclusiveOwner =
  | 'memorize-practice'
  | 'scripture-chapter-audio'
  | 'profile-resource-read-aloud'

export type GospelWebSpeechExclusiveOwnerDetail = {
  owner: GospelWebSpeechExclusiveOwner
}

/** Notify other Listen surfaces (profile TTS, scripture MP3, memorize) to stop. */
export function dispatchGospelExclusiveListenOwner(detail: GospelWebSpeechExclusiveOwnerDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, { detail }))
}

export function dispatchWebSpeechExclusiveOwner(detail: GospelWebSpeechExclusiveOwnerDetail): void {
  if (typeof window === 'undefined') return
  cancelProfileReadAloudSpeech()
  dispatchGospelExclusiveListenOwner(detail)
}
