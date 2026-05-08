/**
 * Profile Listen and memorize Listen share `window.speechSynthesis`. When memorize practice opens,
 * dispatch this so profile read-aloud fully stops and cannot steal pause/resume.
 */
export const GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT = 'gospel-web-speech-exclusive-owner'

export type GospelWebSpeechExclusiveOwnerDetail = {
  owner: 'memorize-practice'
}

export function dispatchWebSpeechExclusiveOwner(detail: GospelWebSpeechExclusiveOwnerDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, { detail }))
}
