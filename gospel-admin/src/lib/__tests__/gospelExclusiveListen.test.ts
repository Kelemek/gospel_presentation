/**
 * @jest-environment jsdom
 */

import {
  announceExclusiveListenOwner,
  claimExclusiveListenOwner,
  GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT,
} from '@/lib/gospelExclusiveListen'

const mockEngineCancel = jest.fn()

jest.mock('@/lib/gospelListenSpeechEngine', () => ({
  getGospelListenSpeechEngine: jest.fn(() => ({
    cancel: mockEngineCancel,
  })),
}))

describe('gospelExclusiveListen', () => {
  beforeEach(() => {
    mockEngineCancel.mockClear()
  })

  it('claimExclusiveListenOwner cancels profile TTS and dispatches the owner', () => {
    const fn = jest.fn()
    window.addEventListener(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, fn)
    claimExclusiveListenOwner('memorize-practice')
    expect(mockEngineCancel).toHaveBeenCalled()
    expect(fn).toHaveBeenCalledTimes(1)
    const ev = fn.mock.calls[0][0] as CustomEvent
    expect(ev.detail).toEqual({ owner: 'memorize-practice' })
    window.removeEventListener(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, fn)
  })

  it('announceExclusiveListenOwner dispatches without canceling profile TTS', () => {
    const fn = jest.fn()
    window.addEventListener(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, fn)
    announceExclusiveListenOwner('profile-resource-read-aloud')
    expect(mockEngineCancel).not.toHaveBeenCalled()
    expect(fn).toHaveBeenCalledTimes(1)
    const ev = fn.mock.calls[0][0] as CustomEvent
    expect(ev.detail).toEqual({ owner: 'profile-resource-read-aloud' })
    window.removeEventListener(GOSPEL_EXCLUSIVE_LISTEN_OWNER_EVENT, fn)
  })

  it('subscribeExclusiveListenPreemption ignores the self owner', async () => {
    const { subscribeExclusiveListenPreemption } = await import('@/lib/gospelExclusiveListen')
    const onPreempted = jest.fn()
    const unsubscribe = subscribeExclusiveListenPreemption(onPreempted, {
      self: 'scripture-chapter-audio',
    })
    claimExclusiveListenOwner('scripture-chapter-audio')
    expect(onPreempted).not.toHaveBeenCalled()
    claimExclusiveListenOwner('profile-resource-read-aloud')
    expect(onPreempted).toHaveBeenCalledWith('profile-resource-read-aloud')
    unsubscribe()
  })
})
