import {
  mcheyneCalendarShortTitleForMonthDay,
  mcheyneCalendarShortTitleForPlanDay,
  mcheyneCalendarTitleForMonthDay,
  mcheyneCalendarTitleForPlanDay,
  mcheynePlanDayForCalendarMonthDay,
  mcheynePlanDayForLocalDate,
} from '@/lib/mcheyne/mcheyneCalendar'

describe('mcheyneCalendar', () => {
  test('Jan 1 maps to plan day 1', () => {
    expect(mcheynePlanDayForCalendarMonthDay(1, 1)).toBe(1)
    expect(mcheyneCalendarTitleForPlanDay(1)).toBe('January 1')
    expect(mcheyneCalendarShortTitleForPlanDay(1)).toBe('Jan 1')
    expect(mcheyneCalendarShortTitleForMonthDay(1, 1)).toBe('Jan 1')
  })

  test('May 27 maps to a valid plan day with matching title', () => {
    const planDay = mcheynePlanDayForCalendarMonthDay(5, 27)
    expect(planDay).toBeGreaterThan(0)
    expect(mcheyneCalendarTitleForMonthDay(5, 27)).toBe('May 27')
    expect(mcheyneCalendarTitleForPlanDay(planDay!)).toBe('May 27')
  })

  test('Feb 29 has no plan entry', () => {
    expect(mcheynePlanDayForCalendarMonthDay(2, 29)).toBeNull()
    expect(mcheyneCalendarTitleForMonthDay(2, 29)).toBeNull()
  })

  test('mcheynePlanDayForLocalDate uses calendar date', () => {
    const d = new Date(2026, 4, 27) // May 27 local
    expect(mcheynePlanDayForLocalDate(d)).toBe(mcheynePlanDayForCalendarMonthDay(5, 27))
  })

  test('Feb 29 local date returns null', () => {
    const d = new Date(2024, 1, 29)
    expect(mcheynePlanDayForLocalDate(d)).toBeNull()
  })
})
