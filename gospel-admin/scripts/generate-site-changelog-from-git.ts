/**
 * One-time backfill: rebuild data/site-changelog.json from git feat/fix history.
 * Ongoing releases: append the same note to deploy-update-changelog.json and
 * site-changelog.json (see append-release-changelog / releaseChangelog.ts).
 *
 * Usage (from gospel-admin/):
 *   npm run generate-site-changelog
 *   npm run generate-site-changelog -- --dry-run
 */
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {
  commitSubjectToChangelogMessage,
  isUserVisibleGospelAdminCommit,
  parseConventionalCommitType,
} from '../src/lib/commitMessageToChangelog'
import type { SiteChangelogEntry } from '../src/lib/siteChangelog'

const REPO_ROOT = path.join(__dirname, '../..')
const SITE_CHANGELOG_PATH = path.join(__dirname, '../data/site-changelog.json')

/** Calendar date in the commit author's local timezone (from git %aI). */
function authorLocalDateFromGitTimestamp(isoTimestamp: string): string {
  const datePrefix = /^(\d{4}-\d{2}-\d{2})/.exec(isoTimestamp.trim())
  if (datePrefix) return datePrefix[1]
  return new Date(isoTimestamp).toISOString().slice(0, 10)
}

function normalizeCommittedAt(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  if (!Number.isFinite(d.getTime())) {
    throw new Error(`Invalid timestamp: ${isoTimestamp}`)
  }
  return d.toISOString()
}

type GitCommit = {
  hash: string
  authorDate: string
  releasedAt: string
  committedAt: string
  subject: string
}

function loadGitCommits(): GitCommit[] {
  const output = execSync(`git log --no-merges --reverse --format='%H|%aI|%s'`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  const commits: GitCommit[] = []
  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    const [hash, authorDate, ...subjectParts] = line.split('|')
    const subject = subjectParts.join('|').trim()
    if (!hash || !authorDate || !subject) continue
    commits.push({
      hash,
      authorDate,
      releasedAt: authorLocalDateFromGitTimestamp(authorDate),
      committedAt: normalizeCommittedAt(authorDate),
      subject,
    })
  }
  return commits
}

function commitOnlyTouchesDeployChangelog(hash: string): boolean {
  const stat = execSync(`git show --name-only --format='' ${hash}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  const files = stat
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
  return (
    files.length > 0 &&
    files.every(
      (f) =>
        f === 'gospel-admin/data/deploy-update-changelog.json' ||
        f === 'data/deploy-update-changelog.json' ||
        f === 'gospel-admin/data/site-changelog.json' ||
        f === 'data/site-changelog.json'
    )
  )
}

function buildEntriesFromGit(): SiteChangelogEntry[] {
  const commits = loadGitCommits()
  const entries: SiteChangelogEntry[] = []
  const seen = new Set<string>()

  for (const commit of commits) {
    if (commitOnlyTouchesDeployChangelog(commit.hash)) continue
    if (!isUserVisibleGospelAdminCommit(commit.subject)) continue

    const type = parseConventionalCommitType(commit.subject)
    const message = commitSubjectToChangelogMessage(commit.subject, type ?? undefined)
    if (!message) continue

    const dedupeKey = `${commit.committedAt}|${message}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    entries.push({
      releasedAt: commit.releasedAt,
      committedAt: commit.committedAt,
      message,
    })
  }

  return entries
}

function sortOldestFirst(entries: SiteChangelogEntry[]): SiteChangelogEntry[] {
  return [...entries].sort((a, b) => {
    const aKey = a.committedAt ?? `${a.releasedAt}T00:00:00.000Z`
    const bKey = b.committedAt ?? `${b.releasedAt}T00:00:00.000Z`
    const timeCmp = aKey.localeCompare(bKey)
    if (timeCmp !== 0) return timeCmp
    return a.message.localeCompare(b.message)
  })
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  const entries = sortOldestFirst(buildEntriesFromGit())

  const json = `${JSON.stringify(entries, null, 2)}\n`
  if (dryRun) {
    process.stdout.write(json)
    process.stderr.write(`Would write ${entries.length} entries to site-changelog.json\n`)
    return
  }

  fs.writeFileSync(SITE_CHANGELOG_PATH, json, 'utf8')
  process.stdout.write(`Wrote ${entries.length} entries to ${SITE_CHANGELOG_PATH}\n`)
}

main()
