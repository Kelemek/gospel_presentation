import {
  cancelMcheyneResumeScroll,
  finishMcheyneResumeScrollSession,
  startMcheyneResumeScroll,
} from '@/lib/mcheyne/mcheyneResumeScrollSession'

describe('mcheyneResumeScrollSession', () => {
  it('start cancels a previous resume scroll RAF before replacing it', () => {
    const active = { current: null as (() => void) | null }
    const firstCancel = jest.fn()
    const secondCancel = jest.fn()

    startMcheyneResumeScroll(active, firstCancel)
    startMcheyneResumeScroll(active, secondCancel)

    expect(firstCancel).toHaveBeenCalledTimes(1)
    expect(secondCancel).not.toHaveBeenCalled()
    expect(active.current).toBe(secondCancel)
  })

  it('cancel invokes and clears the active token', () => {
    const active = { current: null as (() => void) | null }
    const cancel = jest.fn()

    startMcheyneResumeScroll(active, cancel)
    cancelMcheyneResumeScroll(active)

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(active.current).toBeNull()
  })

  it('finish clears the active token without calling cancel', () => {
    const active = { current: null as (() => void) | null }
    const cancel = jest.fn()

    startMcheyneResumeScroll(active, cancel)
    finishMcheyneResumeScrollSession(active)

    expect(cancel).not.toHaveBeenCalled()
    expect(active.current).toBeNull()
  })
})
