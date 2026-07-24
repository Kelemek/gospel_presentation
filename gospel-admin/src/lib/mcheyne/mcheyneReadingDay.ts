import type { GospelSection } from '@/lib/types'
import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import planFile from '../../../data/mcheyne/plan.json'
import { monthNameForPlan, monthSectionId } from '@/lib/mcheyne/buildMcheyneGospelData'
import { mcheyneCalendarDateForPlanDay } from '@/lib/mcheyne/mcheyneCalendar'
import { expandMcheyneReadingToChapterCards } from '@/lib/mcheyne/mcheyneReferenceNormalize'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'

const plan = planFile as McheynePlanFile

const MONTH_FROM_SECTION_ID = new Map<string, number>(
  (
    [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ] as const
  ).map((id, index) => [id, index + 1])
)

const MCHEYNE_DAY_SUBSECTION_ONLY_ID =
  /^section-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d+)$/

export const MCHEYNE_PLAN_DAYS = 365

const MS_PER_DAY = 86_400_000

export type McheyneDayAnchor = {
  sectionId: string
  subsectionId: string
  planDay: number
}

const MCHEYNE_DAY_SUBSECTION_ID =
  /^(section-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d+)(?:-\d+)?$/

/** Day subsection id (e.g. `section-may-26`) from a day or nested Family/Secret anchor. */
export function mcheyneDaySubsectionIdFromAnchor(subsectionId: string): string {
  const match = MCHEYNE_DAY_SUBSECTION_ID.exec(subsectionId.trim())
  return match?.[1] ?? subsectionId
}

/** Plan day (1–365) for a day subsection anchor, or null (e.g. January intro). */
export function mcheynePlanDayFromDaySubsectionId(subsectionId: string): number | null {
  const daySubsectionId = mcheyneDaySubsectionIdFromAnchor(subsectionId)
  const match = MCHEYNE_DAY_SUBSECTION_ONLY_ID.exec(daySubsectionId)
  if (!match) return null

  const month = MONTH_FROM_SECTION_ID.get(match[1])
  if (!month) return null

  const subIndex = parseInt(match[2], 10)
  if (!Number.isFinite(subIndex) || subIndex < 0) return null

  const monthDays = plan.days.filter((d) => d.month === month)
  if (month === 1) {
    if (subIndex === 0) return null
    return monthDays[subIndex - 1]?.day ?? null
  }
  return monthDays[subIndex]?.day ?? null
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

function subsectionMatchesPlanDay(title: string, planDay: number, month: number, monthDay: number): boolean {
  const trimmed = title.trim()
  if (!trimmed) return false
  const monthLabel = monthNameForPlan(month)
  if (trimmed.includes(`${monthLabel} ${monthDay}`)) return true
  // Accept em dash, en dash, or hyphen after "Day N"
  return new RegExp(`^Day\\s+${planDay}\\s*[-–—]`).test(trimmed)
}

/** Find TOC anchor for plan day N (calendar date from plan.json). */
export function findMcheyneDayAnchor(
  sectionList: GospelSection[],
  planDay: number
): McheyneDayAnchor | null {
  if (!Number.isFinite(planDay) || planDay < 1 || planDay > MCHEYNE_PLAN_DAYS) return null

  const cal = mcheyneCalendarDateForPlanDay(planDay)
  if (cal) {
    const monthSection = monthSectionId(cal.month)
    for (const section of sectionList) {
      if (section.section !== monthSection) continue
      const sectionId = `section-${section.section}`
      for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
        const title = section.subsections[subIndex].title?.trim() ?? ''
        if (subsectionMatchesPlanDay(title, planDay, cal.month, cal.monthDay)) {
          return {
            sectionId,
            subsectionId: `${sectionId}-${subIndex}`,
            planDay,
          }
        }
      }
    }
  }

  for (const section of sectionList) {
    const sectionId = `section-${section.section}`
    for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
      const title = section.subsections[subIndex].title?.trim() ?? ''
      if (new RegExp(`^Day\\s+${planDay}\\s*[-–—]`).test(title)) {
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

/** Four chapter references for a plan day: Family (2) then Secret (2). */
export function mcheyneDayChapterReferences(planDay: number): string[] {
  if (!Number.isFinite(planDay) || planDay < 1 || planDay > MCHEYNE_PLAN_DAYS) {
    return []
  }
  const day = plan.days.find((d) => d.day === planDay)
  if (!day) return []
  return [...day.family, ...day.secret].flatMap(expandMcheyneReadingToChapterCards)
}

export type McheyneScriptureCardNav = {
  reference: string
  sectionId: string
  subsectionId: string
}

/** Scripture cards for one plan day in profile order (Family then Secret, expanded chapters). */
export function mcheyneDayScriptureCardsFromRefs(
  allScriptureRefs: readonly McheyneScriptureCardNav[],
  daySubsectionId: string
): McheyneScriptureCardNav[] {
  const dayId = mcheyneDaySubsectionIdFromAnchor(daySubsectionId)
  if (!dayId || mcheynePlanDayFromDaySubsectionId(dayId) == null) return []
  const nestedPrefix = `${dayId}-`
  return allScriptureRefs.filter((card) => card.subsectionId.startsWith(nestedPrefix))
}

/** M'Cheyne Listen playlist refs from live profile cards (editor changes), or null. */
export function mcheyneDayListenReferencesFromCards(
  allScriptureRefs: readonly McheyneScriptureCardNav[],
  subsectionId: string
): string[] | null {
  const cards = mcheyneDayScriptureCardsFromRefs(allScriptureRefs, subsectionId)
  if (cards.length === 0) return null
  return cards.map((card) => card.reference)
}

/** Day playlist for M'Cheyne modal Listen, or null (e.g. January intro). */
export function mcheyneDayChapterReferencesForAnchor(subsectionId: string): string[] | null {
  const planDay = mcheynePlanDayFromDaySubsectionId(subsectionId)
  if (planDay == null) return null
  const refs = mcheyneDayChapterReferences(planDay)
  return refs.length > 0 ? refs : null
}

/** First scripture card on a plan day (Family reading 1) for modal / swipe navigation. */
export function findFirstMcheynePlanDayScriptureNav(
  sectionList: GospelSection[],
  planDay: number
): { reference: string; sectionId: string; subsectionId: string } | null {
  const refs = mcheyneDayChapterReferences(planDay)
  if (refs.length === 0) return null
  const reference = refs[0]!
  const anchors = findFirstScriptureCardAnchors(sectionList, reference)
  if (!anchors) return null
  return { reference, ...anchors }
}
