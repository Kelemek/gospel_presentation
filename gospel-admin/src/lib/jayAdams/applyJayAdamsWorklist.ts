import { mergeScriptureReferenceLists } from '@/lib/acbc/acbcScriptureIndexSync'
import { createSectionForAcbcTopic } from '@/lib/acbc/externalResourceLinksSync'
import { normalizeAcbcSectionTitleKey } from '@/lib/acbc/acbcCuratedScriptureRefs'
import { sortGospelSectionsAlphabetically } from '@/lib/gospelDataSections'
import type { GospelSection, ScriptureReference } from '@/lib/types'

import { loadJayAdamsScriptureRefsBySection } from './loadJayAdamsWorklist'
import { jayAdamsAllTargetSectionTitles, jayAdamsNewSectionTitles } from './jayAdamsTopicToSection'

export type ApplyJayAdamsWorklistResult = {
  sectionsCreated: string[]
  sectionsUpdated: string[]
  refsAddedBySection: Record<string, number>
  unresolved: string[]
}

function findSectionIndex(gospelData: GospelSection[], sectionTitle: string): number {
  const key = normalizeAcbcSectionTitleKey(sectionTitle)
  return gospelData.findIndex((s) => normalizeAcbcSectionTitleKey(s.title ?? '') === key)
}

function ensureSection(gospelData: GospelSection[], sectionTitle: string, created: string[]): GospelSection {
  const idx = findSectionIndex(gospelData, sectionTitle)
  if (idx >= 0) return gospelData[idx]!

  const section = createSectionForAcbcTopic(sectionTitle)
  gospelData.push(section)
  created.push(sectionTitle)
  return section
}

function sectionTitleFromNormalizedKey(
  gospelData: GospelSection[],
  sectionKey: string
): string {
  const found = gospelData.find(
    (s) => normalizeAcbcSectionTitleKey(s.title ?? '') === sectionKey
  )
  if (found?.title) return found.title

  for (const title of jayAdamsAllTargetSectionTitles()) {
    if (normalizeAcbcSectionTitleKey(title) === sectionKey) return title
  }

  return sectionKey
}

/** Merge Jay Adams worklist scripture cards into profile gospel_data (in place). */
export function applyJayAdamsWorklistToGospelData(
  gospelData: GospelSection[],
  jayAdamsBySection?: Map<string, ScriptureReference[]>
): ApplyJayAdamsWorklistResult {
  const loaded = jayAdamsBySection
    ? { bySection: jayAdamsBySection, unresolved: [] as string[] }
    : loadJayAdamsScriptureRefsBySection()

  const sectionsCreated: string[] = []
  const sectionsUpdated: string[] = []
  const refsAddedBySection: Record<string, number> = {}

  for (const title of jayAdamsNewSectionTitles()) {
    ensureSection(gospelData, title, sectionsCreated)
  }

  for (const [sectionKey, jayRefs] of loaded.bySection) {
    if (jayRefs.length === 0) continue

    const sectionTitle = sectionTitleFromNormalizedKey(gospelData, sectionKey)
    const section = ensureSection(gospelData, sectionTitle, sectionsCreated)
    const sub = section.subsections?.[0]
    if (!sub) continue

    const before = sub.scriptureReferences?.length ?? 0
    sub.scriptureReferences = mergeScriptureReferenceLists(sub.scriptureReferences, jayRefs)
    const after = sub.scriptureReferences.length
    const added = after - before
    if (added > 0) {
      sectionsUpdated.push(section.title ?? sectionTitle)
      refsAddedBySection[section.title ?? sectionTitle] = added
    }
  }

  sortGospelSectionsAlphabetically(gospelData)

  return {
    sectionsCreated: [...new Set(sectionsCreated)],
    sectionsUpdated: [...new Set(sectionsUpdated)],
    refsAddedBySection,
    unresolved: loaded.unresolved,
  }
}
