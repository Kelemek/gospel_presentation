import planFile from '../../../data/mcheyne/plan.json'
import { monthNameForPlan } from '@/lib/mcheyne/buildMcheyneGospelData'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'

const plan = planFile as McheynePlanFile

const MONTH_ABBREV = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function calendarKey(month: number, monthDay: number): string {
  return `${month}-${monthDay}`
}

const PLAN_DAY_BY_CALENDAR = new Map<string, number>()
const CALENDAR_BY_PLAN_DAY = new Map<number, { month: number; monthDay: number }>()

for (const day of plan.days) {
  const key = calendarKey(day.month, day.monthDay)
  PLAN_DAY_BY_CALENDAR.set(key, day.day)
  CALENDAR_BY_PLAN_DAY.set(day.day, { month: day.month, monthDay: day.monthDay })
}

/** Plan day (1–365) for a calendar month/day, or null when no reading (e.g. Feb 29). */
export function mcheynePlanDayForCalendarMonthDay(month: number, monthDay: number): number | null {
  if (!Number.isFinite(month) || !Number.isFinite(monthDay)) return null
  if (month < 1 || month > 12 || monthDay < 1 || monthDay > 31) return null
  return PLAN_DAY_BY_CALENDAR.get(calendarKey(month, monthDay)) ?? null
}

/** Plan day for a local calendar date, or null when no reading (e.g. Feb 29). */
export function mcheynePlanDayForLocalDate(date: Date = new Date()): number | null {
  return mcheynePlanDayForCalendarMonthDay(date.getMonth() + 1, date.getDate())
}

function mcheyneCalendarShortTitle(month: number, monthDay: number): string {
  const abbrev = MONTH_ABBREV[month - 1]
  if (!abbrev) throw new Error(`Invalid month: ${month}`)
  return `${abbrev} ${monthDay}`
}

/** Display title e.g. plan day 147 → "May 27". */
export function mcheyneCalendarTitleForPlanDay(planDay: number): string | null {
  const cal = CALENDAR_BY_PLAN_DAY.get(planDay)
  if (!cal) return null
  return `${monthNameForPlan(cal.month)} ${cal.monthDay}`
}

/** Abbreviated title e.g. plan day 147 → "May 27", day 1 → "Jan 1". */
export function mcheyneCalendarShortTitleForPlanDay(planDay: number): string | null {
  const cal = CALENDAR_BY_PLAN_DAY.get(planDay)
  if (!cal) return null
  return mcheyneCalendarShortTitle(cal.month, cal.monthDay)
}

/** Display title for a calendar month/day e.g. (5, 27) → "May 27". */
export function mcheyneCalendarTitleForMonthDay(month: number, monthDay: number): string | null {
  const planDay = mcheynePlanDayForCalendarMonthDay(month, monthDay)
  if (planDay == null) return null
  return mcheyneCalendarTitleForPlanDay(planDay)
}

/** Abbreviated title for a calendar month/day e.g. (5, 27) → "May 27". */
export function mcheyneCalendarShortTitleForMonthDay(month: number, monthDay: number): string | null {
  const planDay = mcheynePlanDayForCalendarMonthDay(month, monthDay)
  if (planDay == null) return null
  return mcheyneCalendarShortTitleForPlanDay(planDay)
}

export function mcheyneCalendarDateForPlanDay(
  planDay: number
): { month: number; monthDay: number } | null {
  return CALENDAR_BY_PLAN_DAY.get(planDay) ?? null
}

/** URL query value for navigating to a plan day on `/mchy`. */
export function mcheynePlanDayQueryHref(planDay: number): string {
  return `/mchy?planDay=${planDay}`
}

export const MCHEYNE_RESUME_PIN_QUERY = 'resumePin=1'

export function mcheyneResumePinQueryHref(): string {
  return `/mchy?${MCHEYNE_RESUME_PIN_QUERY}`
}
