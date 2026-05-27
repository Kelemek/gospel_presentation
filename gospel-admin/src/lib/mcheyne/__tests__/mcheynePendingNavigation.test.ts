import {
  consumePendingMcheynePlanDay,
  consumePendingMcheyneResumePin,
  resolveMcheynePlanDayFromNavigation,
  resolveMcheyneResumePinFromNavigation,
  setPendingMcheynePlanDay,
  setPendingMcheyneResumePin,
} from '@/lib/mcheyne/mcheynePendingNavigation'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

beforeEach(() => {
  installTestLocalStorage()
})

describe('mcheynePendingNavigation', () => {
  it('stores and consumes plan day once', () => {
    setPendingMcheynePlanDay(147)
    expect(consumePendingMcheynePlanDay()).toBe(147)
    expect(consumePendingMcheynePlanDay()).toBeNull()
  })

  it('stores and consumes resume pin once', () => {
    setPendingMcheyneResumePin()
    expect(consumePendingMcheyneResumePin()).toBe(true)
    expect(consumePendingMcheyneResumePin()).toBe(false)
  })

  it('resolve uses valid URL and clears duplicate pending', () => {
    setPendingMcheynePlanDay(99)
    expect(resolveMcheynePlanDayFromNavigation('12')).toBe(12)
    expect(consumePendingMcheynePlanDay()).toBeNull()
  })

  it('resolve uses pending when URL param is absent', () => {
    setPendingMcheynePlanDay(147)
    expect(resolveMcheynePlanDayFromNavigation('')).toBe(147)
  })

  it('resolve does not consume pending when URL param is invalid', () => {
    setPendingMcheynePlanDay(121)
    expect(resolveMcheynePlanDayFromNavigation('0')).toBeNull()
    expect(resolveMcheynePlanDayFromNavigation('abc')).toBeNull()
    expect(consumePendingMcheynePlanDay()).toBe(121)
  })

  it('resolve resume uses valid URL and clears duplicate pending', () => {
    setPendingMcheyneResumePin()
    expect(resolveMcheyneResumePinFromNavigation('1')).toBe(true)
    expect(consumePendingMcheyneResumePin()).toBe(false)
  })

  it('resolve resume uses pending when URL param is absent', () => {
    setPendingMcheyneResumePin()
    expect(resolveMcheyneResumePinFromNavigation('')).toBe(true)
    expect(consumePendingMcheyneResumePin()).toBe(false)
  })

  it('resolve resume does not consume pending when URL param is invalid', () => {
    setPendingMcheyneResumePin()
    expect(resolveMcheyneResumePinFromNavigation('0')).toBe(false)
    expect(consumePendingMcheyneResumePin()).toBe(true)
  })
})
