/**
 * @jest-environment jsdom
 */

import {
  dispatchWebSpeechExclusiveOwner,
  GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT,
} from '@/lib/exclusiveWebSpeechListen'

describe('exclusiveWebSpeechListen', () => {
  it('dispatches a CustomEvent with detail', () => {
    const fn = jest.fn()
    window.addEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, fn)
    dispatchWebSpeechExclusiveOwner({ owner: 'memorize-practice' })
    expect(fn).toHaveBeenCalledTimes(1)
    const ev = fn.mock.calls[0][0] as CustomEvent
    expect(ev.detail).toEqual({ owner: 'memorize-practice' })
    window.removeEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, fn)
  })
})
