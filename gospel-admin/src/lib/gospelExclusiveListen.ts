import { getGospelListenSpeechEngine } from '@/lib/gospelListenSpeechEngine'

/**
 * Profile Listen, memorize Listen, and Bible Reader chapter audio share one device audio
 * focus. Claim an owner to stop profile TTS and notify other surfaces to release playback.
 */
export const GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT = 'gospel-exclusive-listen-owner'

export type GospelExclusiveListenOwner =
  | 'memorize-practice'
  | 'scripture-chapter-audio'
  | 'profile-resource-read-aloud'

export type GospelExclusiveListenOwnerDetail = {
  owner: GospelExclusiveListenOwner
}

/**
 * Notify other Listen surfaces without stopping profile TTS (e.g. profile resume).
 */
export function announceExclusiveListenOwner(owner: GospelExclusiveListenOwner): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, { detail: { owner } }))
}

/**
 * Claim exclusive Listen ownership: stop profile read-aloud TTS, then notify other Listen
 * surfaces (scripture MP3, memorize, profile UI) to stop unless they are the new owner.
 */
export function claimExclusiveListenOwner(owner: GospelExclusiveListenOwner): void {
  if (typeof window === 'undefined') return
  getGospelListenSpeechEngine().cancel()
  announceExclusiveListenOwner(owner)
}

/**
 * Subscribe when another Listen owner preempts this surface. Pass `self` to ignore events
 * emitted by the same owner (e.g. profile read-aloud restarting within one session).
 */
export function subscribeExclusiveListenPreemption(
  onPreempted: (owner: GospelExclusiveListenOwner) => void,
  options?: { self?: GospelExclusiveListenOwner }
): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (ev: Event) => {
    const ce = ev as CustomEvent<GospelExclusiveListenOwnerDetail>
    if (!ce.detail) return
    const { owner } = ce.detail
    if (options?.self && owner === options.self) return
    onPreempted(owner)
  }
  window.addEventListener(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, handler)
  return () => window.removeEventListener(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, handler)
}
