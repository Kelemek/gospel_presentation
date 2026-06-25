import planFile from '../../data/mcheyne/plan.json'
import { buildMcheyneGospelData } from '@/lib/mcheyne/buildMcheyneGospelData'
import {
  mcheyneCalendarShortTitleForMonthDay,
  mcheyneCalendarTitleForMonthDay,
  mcheynePlanDayForCalendarMonthDay,
  mcheynePlanDayForLocalDate,
} from '@/lib/mcheyne/mcheyneCalendar'
import { findMcheyneDayAnchor } from '@/lib/mcheyne/mcheyneReadingDay'
import { MCHEYNE_SLUG, mcheyneProfileTitle } from '@/lib/mcheyne/mcheyneSlug'
import { kindleProfileReadUrl } from '@/lib/kindleReadHtml'
import {
  firstWeekdayOfMonth,
  MORNEVE_MONTH_NAMES,
  MORNING_EVENING_LIBRARY_DEFAULT_TITLE,
  morneveSlugForLocalDate,
  morneveSlugForMmdd,
  morneveTitleForMmdd,
} from '@/lib/spurgeon/morneveSlug'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'

export type KindleReadCalendarKind = 'morneve' | 'mcheyne'

const CALENDAR_TITLES: Record<KindleReadCalendarKind, string> = {
  morneve: MORNING_EVENING_LIBRARY_DEFAULT_TITLE,
  mcheyne: mcheyneProfileTitle(),
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const mcheyneGospelSections = buildMcheyneGospelData(planFile as McheynePlanFile)

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isKindleReadCalendarKind(value: string): value is KindleReadCalendarKind {
  return value === 'morneve' || value === 'mcheyne'
}

export function kindleReadCalendarTitle(kind: KindleReadCalendarKind): string {
  return CALENDAR_TITLES[kind]
}

function daysInMonth(monthIndex: number): number {
  return DAYS_IN_MONTH[monthIndex] ?? 31
}

function clampMonth(month: number): number {
  if (!Number.isFinite(month)) return 1
  return Math.min(12, Math.max(1, Math.floor(month)))
}

function mmddForCalendarDay(monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${mm}${dd}`
}

export function kindleReadCalendarUrl(
  kind: KindleReadCalendarKind,
  month?: number,
  fromSlug?: string
): string {
  const base = `/read/calendar/${kind}/`
  const params = new URLSearchParams()
  if (month != null && month >= 1 && month <= 12) {
    params.set('month', String(month))
  }
  if (fromSlug?.trim()) params.set('from', fromSlug.trim())
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

function kindleMcheyneReadUrlForPlanDay(planDay: number): string | null {
  const anchor = findMcheyneDayAnchor(mcheyneGospelSections, planDay)
  if (!anchor) return null
  return `${kindleProfileReadUrl(MCHEYNE_SLUG)}#${anchor.subsectionId}`
}

function morneveIsTodayCell(
  now: Date,
  monthIndex: number,
  day: number,
  todaySlug: string
): boolean {
  const isToday =
    monthIndex === now.getMonth() &&
    day === now.getDate() &&
    (monthIndex !== 1 || day !== 29 || now.getDate() === 29)
  const isTodayFeb28NonLeap =
    monthIndex === 1 &&
    day === 28 &&
    now.getMonth() === 1 &&
    now.getDate() === 28 &&
    todaySlug === morneveSlugForMmdd('0229')
  return isToday || isTodayFeb28NonLeap
}

function renderMorneveTodayRow(now: Date): string {
  const todaySlug = morneveSlugForLocalDate(now)
  const todayTitle = morneveTitleForMmdd(todaySlug.replace(/^me/i, ''))
  const href = kindleProfileReadUrl(todaySlug)
  return `<p class="kindle-read-calendar-today">
    <a class="kindle-read-calendar-today-link" href="${escapeHtml(href)}">Today &mdash; ${escapeHtml(todayTitle)}</a>
  </p>`
}

function renderMcheyneTodayRow(now: Date): string {
  const todayPlanDay = mcheynePlanDayForLocalDate(now)
  const todayDateLabel = mcheyneCalendarShortTitleForMonthDay(now.getMonth() + 1, now.getDate())
  if (todayPlanDay != null && todayDateLabel) {
    const href = kindleMcheyneReadUrlForPlanDay(todayPlanDay)
    if (href) {
      return `<p class="kindle-read-calendar-today">
        <a class="kindle-read-calendar-today-link" href="${escapeHtml(href)}">Today &mdash; ${escapeHtml(todayDateLabel)}</a>
      </p>`
    }
  }
  return `<p class="kindle-read-calendar-today kindle-read-calendar-today--empty">No reading for today (Feb 29)</p>`
}

function renderMorneveDayCell(now: Date, monthIndex: number, day: number, todaySlug: string): string {
  const mmdd = mmddForCalendarDay(monthIndex, day)
  const slug = morneveSlugForMmdd(mmdd)
  const highlight = morneveIsTodayCell(now, monthIndex, day, todaySlug)
  const href = kindleProfileReadUrl(slug)
  const className = highlight
    ? 'kindle-read-calendar-day kindle-read-calendar-day--today'
    : 'kindle-read-calendar-day'
  return `<a class="${className}" href="${escapeHtml(href)}" aria-label="${escapeHtml(morneveTitleForMmdd(mmdd))}">${day}</a>`
}

function renderMcheyneDayCell(now: Date, monthIndex: number, day: number): string {
  const month = monthIndex + 1
  const planDay = mcheynePlanDayForCalendarMonthDay(month, day)
  const calTitle = mcheyneCalendarTitleForMonthDay(month, day)
  const isToday = monthIndex === now.getMonth() && day === now.getDate()

  if (planDay == null) {
    return `<span class="kindle-read-calendar-day kindle-read-calendar-day--disabled" aria-label="${escapeHtml(calTitle ?? '')}">${day}</span>`
  }

  const href = kindleMcheyneReadUrlForPlanDay(planDay)
  if (!href) {
    return `<span class="kindle-read-calendar-day kindle-read-calendar-day--disabled">${day}</span>`
  }

  const className = isToday
    ? 'kindle-read-calendar-day kindle-read-calendar-day--today'
    : 'kindle-read-calendar-day'
  return `<a class="${className}" href="${escapeHtml(href)}" aria-label="${escapeHtml(calTitle ?? `Day ${planDay}`)}">${day}</a>`
}

function renderCalendarGrid(
  kind: KindleReadCalendarKind,
  monthIndex: number,
  now: Date
): string {
  const year = now.getFullYear()
  const count = daysInMonth(monthIndex)
  const firstWeekday = firstWeekdayOfMonth(year, monthIndex)
  const todaySlug = kind === 'morneve' ? morneveSlugForLocalDate(now) : ''

  const weekdayHeader = WEEKDAY_LABELS.map(
    (label) => `<div class="kindle-read-calendar-weekday">${escapeHtml(label)}</div>`
  ).join('')

  const cells: string[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push('<div class="kindle-read-calendar-cell kindle-read-calendar-cell--empty" aria-hidden="true"></div>')
  }
  for (let day = 1; day <= count; day++) {
    const dayHtml =
      kind === 'morneve'
        ? renderMorneveDayCell(now, monthIndex, day, todaySlug)
        : renderMcheyneDayCell(now, monthIndex, day)
    cells.push(`<div class="kindle-read-calendar-cell">${dayHtml}</div>`)
  }
  while (cells.length % 7 !== 0) {
    cells.push('<div class="kindle-read-calendar-cell kindle-read-calendar-cell--empty" aria-hidden="true"></div>')
  }

  return `<div class="kindle-read-calendar-grid">
    <div class="kindle-read-calendar-weekdays">${weekdayHeader}</div>
    <div class="kindle-read-calendar-days">${cells.join('')}</div>
  </div>`
}

export type KindleReadCalendarRenderOptions = {
  kind: KindleReadCalendarKind
  month: number
  fromSlug?: string
  now?: Date
}

export function renderKindleReadCalendarHtml({
  kind,
  month,
  fromSlug,
  now = new Date(),
}: KindleReadCalendarRenderOptions): string {
  const monthClamped = clampMonth(month)
  const monthIndex = monthClamped - 1
  const monthName = MORNEVE_MONTH_NAMES[monthIndex]
  const title = kindleReadCalendarTitle(kind)
  const backHref = fromSlug?.trim()
    ? kindleProfileReadUrl(fromSlug.trim())
    : kindleProfileReadUrl('default')

  const prevMonth = monthClamped <= 1 ? 12 : monthClamped - 1
  const nextMonth = monthClamped >= 12 ? 1 : monthClamped + 1
  const prevHref = kindleReadCalendarUrl(kind, prevMonth, fromSlug)
  const nextHref = kindleReadCalendarUrl(kind, nextMonth, fromSlug)

  const todayRow = kind === 'morneve' ? renderMorneveTodayRow(now) : renderMcheyneTodayRow(now)
  const grid = renderCalendarGrid(kind, monthIndex, now)

  return `<header class="kindle-read-header kindle-read-calendar-header">
    <div class="kindle-read-header-inner">
      <p class="kindle-read-site-title">The Gospel Presentation</p>
      <h1 class="kindle-read-profile-title">${escapeHtml(title)}</h1>
      <p class="kindle-read-nav"><a href="${escapeHtml(backHref)}">Back</a></p>
      ${todayRow}
    </div>
  </header>
  <main class="kindle-read-main">
    <nav class="kindle-read-calendar-nav" aria-label="Month">
      <a class="kindle-read-calendar-nav-prev" href="${escapeHtml(prevHref)}" aria-label="Previous month">&lsaquo;</a>
      <span class="kindle-read-calendar-nav-month">${escapeHtml(monthName)}</span>
      <a class="kindle-read-calendar-nav-next" href="${escapeHtml(nextHref)}" aria-label="Next month">&rsaquo;</a>
    </nav>
    ${grid}
  </main>`
}
