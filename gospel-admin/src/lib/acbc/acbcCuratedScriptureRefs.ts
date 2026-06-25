import fs from 'fs'
import path from 'path'

import { mergeScriptureReferenceLists } from '@/lib/acbc/acbcScriptureIndexSync'
import type { ScriptureReference } from '@/lib/types'

import { loadJayAdamsScriptureRefsBySection } from '@/lib/jayAdams/loadJayAdamsWorklist'

const DEFAULT_CURATED_SCRIPTURE_PATH = path.join(
  process.cwd(),
  'data/templates/biblical-counseling-topics-verses.admin-backup.json'
)

const DEFAULT_ELECTION_SCRIPTURE_PATH = path.join(
  process.cwd(),
  'data/templates/acbc-election-scripture-refs.json'
)

const DEFAULT_JAY_ADAMS_WORKLIST_PATH = path.join(
  process.cwd(),
  'data/jay-adams/topical-worklist.json'
)

export function normalizeAcbcSectionTitleKey(title: string): string {
  return (title || '').trim().toLowerCase()
}

function loadCuratedRefsFromAdminBackupTemplate(filePath: string): Map<string, ScriptureReference[]> {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    profile?: { gospelData?: { title?: string; subsections?: { scriptureReferences?: ScriptureReference[] }[] }[] }
  }
  const map = new Map<string, ScriptureReference[]>()
  for (const section of raw.profile?.gospelData ?? []) {
    const key = normalizeAcbcSectionTitleKey(section.title ?? '')
    if (!key) continue
    const refs = section.subsections?.[0]?.scriptureReferences ?? []
    if (refs.length > 0) map.set(key, refs)
  }
  return map
}

function loadElectionCuratedScriptureRefs(filePath: string): ScriptureReference[] {
  if (!fs.existsSync(filePath)) return []
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ScriptureReference[]
  return Array.isArray(raw) ? raw : []
}

/** Key-passage scripture cards for core counseling topics (admin backup + Election + Jay Adams worklist). */
export function loadCuratedAcbcScriptureRefsBySection(
  filePath: string = DEFAULT_CURATED_SCRIPTURE_PATH,
  electionScripturePath: string = DEFAULT_ELECTION_SCRIPTURE_PATH,
  jayAdamsWorklistPath: string = DEFAULT_JAY_ADAMS_WORKLIST_PATH
): Map<string, ScriptureReference[]> {
  const map = loadCuratedRefsFromAdminBackupTemplate(filePath)
  const electionRefs = loadElectionCuratedScriptureRefs(electionScripturePath)
  if (electionRefs.length > 0) {
    map.set(normalizeAcbcSectionTitleKey('Election'), electionRefs)
  }

  if (fs.existsSync(jayAdamsWorklistPath)) {
    const { bySection: jayAdamsBySection } = loadJayAdamsScriptureRefsBySection(jayAdamsWorklistPath)
    for (const [key, jayRefs] of jayAdamsBySection) {
      const existing = map.get(key) ?? []
      map.set(key, mergeScriptureReferenceLists(existing, jayRefs))
    }
  }

  return map
}

export function curatedScriptureRefsForSectionTitle(
  curatedBySection: Map<string, ScriptureReference[]>,
  sectionTitle: string
): ScriptureReference[] {
  return curatedBySection.get(normalizeAcbcSectionTitleKey(sectionTitle)) ?? []
}
