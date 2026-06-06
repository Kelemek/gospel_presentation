import fs from 'fs'
import path from 'path'

import type { ExternalResourceLink, GospelSection, ScriptureReference } from '@/lib/types'

import { renumberGospelSections } from '@/lib/gospelDataSections'

import {
  curatedScriptureRefsForSectionTitle,
  loadCuratedAcbcScriptureRefsBySection,
} from './acbcCuratedScriptureRefs'
import {
  buildAcbcArticleScriptureIndexFromScriptureIndex,
  mergeAcbcArticleScriptureIndexMaps,
  mergeScriptureReferenceLists,
  parseAcbcResourceCardScriptureRefsFromHtml,
  scriptureReferencesForAcbcExternalLinks,
} from './acbcScriptureIndexSync'
import {
  ACBC_TOPICS_TO_ADD_AS_SECTIONS,
  findAcbcSlugsForSectionTitle,
  isAcbcExcludedSectionTitle,
  removeExcludedAcbcSections,
  sectionTitleForAcbcTopic,
} from './acbcTopicCatalog'

export { renumberGospelSections } from '@/lib/gospelDataSections'

export type AcbcSyncSectionResult = {
  title: string
  status: string
  count: number
  scriptureCount?: number
  added?: number
  removed?: number
}

export type AcbcSyncOptions = {
  profileSlug: string
  dryRun?: boolean
  reconcile?: boolean
  missingOnly?: boolean
  onlySections?: string[] | null
  curatedElectionPath?: string
  /** When true (default), populate scripture cards from ACBC scripture index + topic card subtitles. */
  syncScriptureRefs?: boolean
  /** Pre-built article URL → refs map (tests); built from scripture index when omitted. */
  articleScriptureIndex?: Map<string, string[]>
  /** Section title → curated key passages (tests); loaded from admin backup when omitted. */
  curatedScriptureRefsBySection?: Map<string, ScriptureReference[]>
  curatedScriptureRefsPath?: string
  /** When false, skip fetching ACBC article bodies for scripture-index book matches. Default true. */
  scrapeAcbcArticleBodies?: boolean
}

const DEFAULT_CURATED_ELECTION_PATH = path.join(
  process.cwd(),
  'data/templates/acbc-election-external-links.json'
)

const RESOURCE_LINK_RE =
  /<h3>\s*<a href="(https:\/\/biblicalcounseling\.com\/resource-library\/(?:articles|podcast-episodes|conference-messages|recommended-books)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/gi

export function normalizeAcbcResourceUrl(url: string): string {
  const trimmed = (url || '').trim().split('?')[0].replace(/\/$/, '')
  return `${trimmed}/`
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseAcbcResourceLinksFromHtml(html: string): ExternalResourceLink[] {
  const byUrl = new Map<string, ExternalResourceLink>()
  let match: RegExpExecArray | null
  const re = new RegExp(RESOURCE_LINK_RE.source, RESOURCE_LINK_RE.flags)
  while ((match = re.exec(html)) !== null) {
    const url = normalizeAcbcResourceUrl(match[1])
    const label = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ''))
    if (label && !byUrl.has(url)) {
      byUrl.set(url, { label, url })
    }
  }
  return [...byUrl.values()]
}

export function reconcileExternalResourceLinks(
  existing: ExternalResourceLink[] | undefined,
  fetched: ExternalResourceLink[]
): { links: ExternalResourceLink[]; added: number; removed: number } {
  const existingList = existing ?? []
  const existingUrls = new Set(existingList.map((l) => normalizeAcbcResourceUrl(l.url)))
  const fetchedUrls = new Set(fetched.map((l) => normalizeAcbcResourceUrl(l.url)))

  let added = 0
  let removed = 0
  for (const url of fetchedUrls) {
    if (!existingUrls.has(url)) added += 1
  }
  for (const url of existingUrls) {
    if (!fetchedUrls.has(url)) removed += 1
  }

  return { links: fetched, added, removed }
}

export async function fetchAcbcTopicPageHtml(slug: string): Promise<string> {
  const indexUrl = `https://biblicalcounseling.com/resource-library/topic-index/${slug}/`
  const res = await fetch(indexUrl, {
    headers: { 'User-Agent': 'gospel-presentation-sync/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${indexUrl}`)
  return res.text()
}

export type AcbcTopicLinksFetchResult = {
  links: ExternalResourceLink[]
  topicPageScriptureRefs: Map<string, string[]>
}

export async function fetchAcbcLinksForSlugs(slugs: string[]): Promise<AcbcTopicLinksFetchResult> {
  const seen = new Set<string>()
  const merged: ExternalResourceLink[] = []
  const topicPageScriptureRefs: Map<string, string[]>[] = []

  for (const slug of slugs) {
    const html = await fetchAcbcTopicPageHtml(slug)
    topicPageScriptureRefs.push(parseAcbcResourceCardScriptureRefsFromHtml(html))
    for (const link of parseAcbcResourceLinksFromHtml(html)) {
      const url = normalizeAcbcResourceUrl(link.url)
      if (seen.has(url)) continue
      seen.add(url)
      merged.push(link)
    }
  }

  return {
    links: merged,
    topicPageScriptureRefs: mergeAcbcArticleScriptureIndexMaps(...topicPageScriptureRefs),
  }
}

export function loadCuratedElectionLinks(filePath: string = DEFAULT_CURATED_ELECTION_PATH): ExternalResourceLink[] {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ExternalResourceLink[]
}

export function sectionTitleExists(gospelData: GospelSection[], title: string): boolean {
  const lower = title.trim().toLowerCase()
  return gospelData.some((s) => (s.title || '').trim().toLowerCase() === lower)
}

/** ACBC link-hub sections show scripture + external link cards only (no intro paragraph). */
export function clearAcbcLinkSectionBody(subsection: { content?: string }): void {
  subsection.content = ''
}

export function createSectionForAcbcTopic(title: string): GospelSection {
  return {
    section: '0',
    title,
    subsections: [
      {
        title: '',
        content: '',
        scriptureReferences: [],
        externalResourceLinks: [],
      },
    ],
  }
}

export type AddMissingSectionsResult = {
  added: string[]
  skipped: string[]
}

/** Insert profile sections for ACBC topics not yet on the profile. */
export function addMissingAcbcSections(gospelData: GospelSection[]): AddMissingSectionsResult {
  const added: string[] = []
  const skipped: string[] = []

  for (const topic of ACBC_TOPICS_TO_ADD_AS_SECTIONS) {
    const title = sectionTitleForAcbcTopic(topic)
    if (isAcbcExcludedSectionTitle(title)) continue
    if (sectionTitleExists(gospelData, title)) {
      skipped.push(title)
      continue
    }
    gospelData.push(createSectionForAcbcTopic(title))
    added.push(title)
  }

  renumberGospelSections(gospelData)
  return { added, skipped }
}

export async function syncAcbcExternalLinksOnGospelData(
  gospelData: GospelSection[],
  options: Omit<AcbcSyncOptions, 'profileSlug' | 'dryRun'> & {
    curatedElectionPath?: string
  }
): Promise<AcbcSyncSectionResult[]> {
  const {
    reconcile = false,
    missingOnly = false,
    onlySections = null,
    curatedElectionPath = DEFAULT_CURATED_ELECTION_PATH,
    syncScriptureRefs = true,
    articleScriptureIndex: providedArticleScriptureIndex,
    curatedScriptureRefsBySection: providedCuratedScriptureRefsBySection,
    curatedScriptureRefsPath,
    scrapeAcbcArticleBodies = true,
  } = options

  const summary: AcbcSyncSectionResult[] = []
  let articleScriptureIndex = providedArticleScriptureIndex
  if (syncScriptureRefs && !articleScriptureIndex) {
    articleScriptureIndex = await buildAcbcArticleScriptureIndexFromScriptureIndex({
      scrapeArticleBodies: scrapeAcbcArticleBodies,
    })
  }
  const curatedScriptureRefsBySection =
    providedCuratedScriptureRefsBySection ??
    (syncScriptureRefs
      ? loadCuratedAcbcScriptureRefsBySection(curatedScriptureRefsPath)
      : new Map())

  removeExcludedAcbcSections(gospelData)

  for (const section of gospelData) {
    const title = (section.title || '').trim()
    if (
      onlySections?.length &&
      !onlySections.some((name) => name.toLowerCase() === title.toLowerCase())
    ) {
      continue
    }

    const mapping = findAcbcSlugsForSectionTitle(title)
    if (!mapping) {
      summary.push({ title, status: 'skipped (no mapping)', count: 0 })
      continue
    }

    const sub = section.subsections?.[0]
    if (!sub) {
      summary.push({ title, status: 'skipped (no subsection)', count: 0 })
      continue
    }

    clearAcbcLinkSectionBody(sub)

    const existing = sub.externalResourceLinks ?? []
    const existingCount = existing.length

    if (missingOnly && existingCount > 0) {
      summary.push({
        title,
        status: 'skipped (already has links)',
        count: existingCount,
      })
      continue
    }

    if (!reconcile && !missingOnly && title === 'Anger' && existingCount > 1) {
      summary.push({
        title,
        status: 'skipped (already populated)',
        count: existingCount,
      })
      continue
    }

    let links: ExternalResourceLink[]
    let added = 0
    let removed = 0

    let topicPageScriptureRefs = new Map<string, string[]>()

    if (mapping === 'curated') {
      links = loadCuratedElectionLinks(curatedElectionPath)
    } else {
      const fetched = await fetchAcbcLinksForSlugs(mapping)
      topicPageScriptureRefs = fetched.topicPageScriptureRefs
      links = fetched.links
      if (reconcile || missingOnly) {
        const diff = reconcileExternalResourceLinks(existing, links)
        links = diff.links
        added = diff.added
        removed = diff.removed
      }
    }

    const existingScriptureRefs = sub.scriptureReferences
    sub.externalResourceLinks = links

    if (syncScriptureRefs && articleScriptureIndex) {
      const mergedIndex = mergeAcbcArticleScriptureIndexMaps(
        articleScriptureIndex,
        topicPageScriptureRefs
      )
      const acbcDerived = scriptureReferencesForAcbcExternalLinks(links, mergedIndex)
      const curated = curatedScriptureRefsForSectionTitle(curatedScriptureRefsBySection, title)
      // Keep all existing scripture cards when links reconcile away; ACBC-derived refs only add.
      sub.scriptureReferences = mergeScriptureReferenceLists(
        curated,
        existingScriptureRefs,
        acbcDerived
      )
    }

    summary.push({
      title,
      status: reconcile && mapping !== 'curated' ? 'reconciled' : 'updated',
      count: links.length,
      scriptureCount: syncScriptureRefs ? (sub.scriptureReferences?.length ?? 0) : undefined,
      added: mapping !== 'curated' ? added : undefined,
      removed: mapping !== 'curated' ? removed : undefined,
    })
  }

  return summary
}
