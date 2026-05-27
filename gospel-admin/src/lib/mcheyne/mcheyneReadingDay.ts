import type { GospelSection } from '@/lib/types'

export const MCHEYNE_PLAN_DAYS = 365

const MS_PER_DAY = 86_400_000

export type McheyneDayAnchor = {
  sectionId: string
  subsectionId: string
  planDay: number
}

/** Local calendar midnight for date math. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Parse `YYYY-MM-DD` as a local calendar date; null when invalid. */
export function parseLocalIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const y = parseInt(m[1], 10)
  const monthIndex = parseInt(m[2], 10) - 1
  const d = parseInt(m[3], 10)
  const date = new Date(y, monthIndex, d)
  if (date.getFullYear() !== y || date.getMonth() !== monthIndex || date.getDate() !== d) {
    return null
  }
  return date
}

export function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Plan day (1–365) from start date through today (inclusive day 1 on start date). */
export function mcheynePlanDayForDates(startDate: Date, today: Date = new Date()): number {
  const start = startOfLocalDay(startDate)
  const end = startOfLocalDay(today)
  const elapsed = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY)
  return Math.min(Math.max(elapsed + 1, 1), MCHEYNE_PLAN_DAYS)
}

/** True when today is past day 365 of the plan. */
export function isMcheynePlanComplete(startDate: Date, today: Date = new Date()): boolean {
  const start = startOfLocalDay(startDate)
  const end = startOfLocalDay(today)
  const elapsed = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY)
  return elapsed + 1 > MCHEYNE_PLAN_DAYS
}

/** Find TOC anchor for plan day N (`Day N — …` subsection title). */
export function findMcheyneDayAnchor(
  sectionList: GospelSection[],
  planDay: number
): McheyneDayAnchor | null {
  if (!Number.isFinite(planDay) || planDay < 1 || planDay > MCHEYNE_PLAN_DAYS) return null
  const prefix = `Day ${planDay} —`
  for (const section of sectionList) {
    const sectionId = `section-${section.section}`
    for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
      const title = section.subsections[subIndex].title?.trim() ?? ''
      if (title.startsWith(prefix)) {
        return {
          sectionId,
          subsectionId: `${sectionId}-${subIndex}`,
          planDay,
        }
      }
    }
  }
  return null
}
