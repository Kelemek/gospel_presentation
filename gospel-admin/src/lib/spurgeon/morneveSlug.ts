/** Calendar month names for `meMMDD` slugs (01 = January). */
export const MORNEVE_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MORNEVE_SLUG_RE = /^me(\d{4})$/i

/** Default label for the Resources menu row that opens {@link MorneveDevotionsModal}. */
export const MORNING_EVENING_LIBRARY_DEFAULT_TITLE = "Spurgeon's Morning and Evening"

const LEGACY_MORNEVE_LIBRARY_MENU_TITLES = new Set([
  'Morning and Evening Devotions',
  'Morning & Evening Devotions',
])

/** Resources menu title; maps legacy defaults to {@link MORNING_EVENING_LIBRARY_DEFAULT_TITLE}. */
export function morneveLibraryMenuTitle(title: string | undefined | null): string {
  const t = title?.trim() ?? ''
  if (!t || LEGACY_MORNEVE_LIBRARY_MENU_TITLES.has(t)) {
    return MORNING_EVENING_LIBRARY_DEFAULT_TITLE
  }
  return t
}

/** True when `slug` is a CCEL Morning & Evening day profile (`me` + MMDD). */
export function isMorneveProfileSlug(slug: string): boolean {
  return MORNEVE_SLUG_RE.test(slug.trim())
}

/** Parse `me0315` → `0315` or null. */
export function morneveMmddFromSlug(slug: string): string | null {
  const m = MORNEVE_SLUG_RE.exec(slug.trim())
  return m ? m[1] : null
}

export function morneveSlugForMmdd(mmdd: string): string {
  return `me${mmdd}`
}

/**
 * Day-of-week index (0 = Sunday) for the 1st of a calendar month.
 * Used to lay out the Morning & Evening month picker grid for the given year.
 */
export function firstWeekdayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay()
}

/** Display title e.g. `0315` → "March 15". */
export function morneveTitleForMmdd(mmdd: string): string {
  const month = parseInt(mmdd.slice(0, 2), 10)
  const day = parseInt(mmdd.slice(2, 4), 10)
  const name = MORNEVE_MONTH_NAMES[month - 1]
  if (!name || !Number.isFinite(day) || day < 1) return mmdd
  return `${name} ${day}`
}

/** ThML div2 id `d0101am` → `0101`. */
export function morneveMmddFromDiv2Id(id: string): string | null {
  const m = /^d(\d{2})(\d{2})(am|pm)$/i.exec(id.trim())
  if (!m) return null
  const month = parseInt(m[1], 10)
  const day = parseInt(m[2], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${m[1]}${m[2]}`
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Local calendar date → `meMMDD` slug.
 * On non–leap years, Feb 28 maps to `me0229` (CCEL includes Feb 29 readings).
 */
export function morneveSlugForLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (month === 2 && day === 28 && !isLeapYear(year)) {
    return morneveSlugForMmdd('0229')
  }

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return morneveSlugForMmdd(`${mm}${dd}`)
}

/** Sort key for calendar order (January 1 first). */
export function morneveSortKeyFromSlug(slug: string): number {
  const mmdd = morneveMmddFromSlug(slug)
  if (!mmdd) return Number.MAX_SAFE_INTEGER
  return parseInt(mmdd, 10)
}

export function sortMorneveRowsByCalendar<T extends { slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => morneveSortKeyFromSlug(a.slug) - morneveSortKeyFromSlug(b.slug))
}
