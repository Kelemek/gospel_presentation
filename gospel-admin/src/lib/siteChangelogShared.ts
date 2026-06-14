import { truncateReleaseChangelogMessage } from '@/lib/changelogShared'

export type SiteChangelogEntry = {
  releasedAt: string
  /** ISO timestamp; orders entries on the same calendar day (newest first in the modal). */
  committedAt?: string
  message: string
}

export type SiteChangelogMonthGroup = {
  label: string
  entries: SiteChangelogEntry[]
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const monthYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function normalizeSiteChangelogReleasedAt(value: string): string | null {
  const trimmed = value.trim()
  if (!ISO_DATE_RE.test(trimmed)) return null
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`)
  if (!Number.isFinite(parsed)) return null
  return trimmed
}

export function parseSiteChangelogFileContent(raw: string): SiteChangelogEntry[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const entries: SiteChangelogEntry[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const message =
        typeof record.message === 'string' ? record.message.trim() : ''
      const releasedAt =
        typeof record.releasedAt === 'string'
          ? normalizeSiteChangelogReleasedAt(record.releasedAt)
          : null
      if (!message || !releasedAt) continue
      const committedAt =
        typeof record.committedAt === 'string' && record.committedAt.trim()
          ? record.committedAt.trim()
          : undefined
      entries.push({
        releasedAt,
        ...(committedAt ? { committedAt } : {}),
        message: truncateReleaseChangelogMessage(message),
      })
    }
    return entries
  } catch {
    return []
  }
}

export function monthYearLabelFromReleasedAt(releasedAt: string): string {
  const [year, month, day] = releasedAt.split('-').map(Number)
  return monthYearFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

function committedAtSortKey(entry: SiteChangelogEntry): string {
  return entry.committedAt ?? `${entry.releasedAt}T00:00:00.000Z`
}

/** Stable React list key; committedAt disambiguates same-day duplicate messages. */
export function siteChangelogEntryKey(entry: SiteChangelogEntry): string {
  return `${committedAtSortKey(entry)}|${entry.message}`
}

/** Newest first: release time when present, else calendar date. */
export function compareSiteChangelogEntriesNewestFirst(
  a: SiteChangelogEntry,
  b: SiteChangelogEntry
): number {
  const timeCmp = committedAtSortKey(b).localeCompare(committedAtSortKey(a))
  if (timeCmp !== 0) return timeCmp
  const dateCmp = b.releasedAt.localeCompare(a.releasedAt)
  if (dateCmp !== 0) return dateCmp
  return b.message.localeCompare(a.message)
}

/** Group entries newest month first; within each month, newest release first. */
export function groupSiteChangelogByMonth(
  entries: SiteChangelogEntry[]
): SiteChangelogMonthGroup[] {
  if (!entries.length) return []

  const sorted = [...entries].sort(compareSiteChangelogEntriesNewestFirst)

  const groups: SiteChangelogMonthGroup[] = []
  for (const entry of sorted) {
    const label = monthYearLabelFromReleasedAt(entry.releasedAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) {
      last.entries.push(entry)
    } else {
      groups.push({ label, entries: [entry] })
    }
  }
  return groups
}
