import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'
import { truncateReleaseChangelogMessage } from '@/lib/changelogShared'
import {
  normalizeSiteChangelogReleasedAt,
  parseSiteChangelogFileContent,
  type SiteChangelogEntry,
} from '@/lib/siteChangelogShared'

export type { SiteChangelogEntry, SiteChangelogMonthGroup } from '@/lib/siteChangelogShared'
export {
  compareSiteChangelogEntriesNewestFirst,
  groupSiteChangelogByMonth,
  monthYearLabelFromReleasedAt,
  parseSiteChangelogFileContent,
  siteChangelogEntryKey,
} from '@/lib/siteChangelogShared'

const SITE_CHANGELOG_FILE = path.join(process.cwd(), 'data', 'site-changelog.json')

function truncateSiteChangelogMessage(message: string): string {
  const truncated = truncateReleaseChangelogMessage(message)
  if (truncated !== message) {
    logger.warn('Site changelog entry truncated to fit display limit')
  }
  return truncated
}

/** Full site history (oldest first). Append one object per user-visible release. */
export function readSiteChangelog(): SiteChangelogEntry[] {
  try {
    if (!fs.existsSync(SITE_CHANGELOG_FILE)) {
      return []
    }
    const raw = fs.readFileSync(SITE_CHANGELOG_FILE, 'utf8')
    return parseSiteChangelogFileContent(raw)
  } catch (error) {
    logger.warn('Failed to read site changelog file', error)
    return []
  }
}

function localReleasedAtDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function writeSiteChangelog(entries: SiteChangelogEntry[]): void {
  fs.writeFileSync(SITE_CHANGELOG_FILE, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}

/** Append one dated release note (oldest first). Use appendReleaseChangelog to mirror deploy JSON. */
export function appendSiteChangelogEntry(
  message: string,
  options?: { releasedAt?: string; committedAt?: string }
): SiteChangelogEntry {
  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error('Release note message is required')
  }

  const releasedAt = normalizeSiteChangelogReleasedAt(
    options?.releasedAt ?? localReleasedAtDate()
  )
  if (!releasedAt) {
    throw new Error('releasedAt must be YYYY-MM-DD')
  }

  const entry: SiteChangelogEntry = {
    releasedAt,
    committedAt: options?.committedAt ?? new Date().toISOString(),
    message: truncateSiteChangelogMessage(trimmed),
  }

  const entries = readSiteChangelog()
  entries.push(entry)
  writeSiteChangelog(entries)
  return entry
}
