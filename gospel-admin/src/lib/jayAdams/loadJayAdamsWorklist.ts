import fs from 'fs'
import path from 'path'

import { mergeScriptureReferenceLists } from '@/lib/acbc/acbcScriptureIndexSync'
import { normalizeAcbcSectionTitleKey } from '@/lib/acbc/acbcCuratedScriptureRefs'
import type { ScriptureReference } from '@/lib/types'

import { routeJayAdamsTopic } from './jayAdamsTopicToSection'
import { parseJayAdamsWorklistLines } from './parseJayAdamsWorklistLines'

export type JayAdamsWorklistTopic = {
  title: string
  seeAlso?: string
  lines?: string[]
  subsections?: { label: string; lines: string[] }[]
}

export type JayAdamsWorklistFile = {
  source: string
  book: string
  pages: number[]
  topics: JayAdamsWorklistTopic[]
}

const DEFAULT_WORKLIST_PATH = path.join(process.cwd(), 'data/jay-adams/topical-worklist.json')

export function loadJayAdamsWorklistFile(
  filePath: string = DEFAULT_WORKLIST_PATH
): JayAdamsWorklistFile {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as JayAdamsWorklistFile
  return raw
}

function addRefsToSectionMap(
  map: Map<string, ScriptureReference[]>,
  sectionTitle: string,
  lines: string[]
): string[] {
  const { references, unresolved } = parseJayAdamsWorklistLines(lines)
  if (references.length === 0) return unresolved

  const key = normalizeAcbcSectionTitleKey(sectionTitle)
  const existing = map.get(key) ?? []
  const merged = mergeScriptureReferenceLists(
    existing,
    references.map((reference) => ({ reference, favorite: false }))
  )
  map.set(key, merged)
  return unresolved
}

/** Build profile section title → scripture refs from the committed worklist JSON. */
export function loadJayAdamsScriptureRefsBySection(
  filePath: string = DEFAULT_WORKLIST_PATH
): { bySection: Map<string, ScriptureReference[]>; unresolved: string[] } {
  const file = loadJayAdamsWorklistFile(filePath)
  const bySection = new Map<string, ScriptureReference[]>()
  const unresolved: string[] = []

  for (const topic of file.topics) {
    const lines = topic.lines ?? []
    const route = routeJayAdamsTopic(topic.title, lines)

    if (route.kind === 'skip') continue

    if (route.kind === 'split') {
      for (const part of route.routes) {
        if (part.lines.length === 0) continue
        unresolved.push(...addRefsToSectionMap(bySection, part.sectionTitle, part.lines))
      }
      for (const sub of topic.subsections ?? []) {
        const subRoute = routeJayAdamsTopic(sub.label, sub.lines)
        if (subRoute.kind !== 'section') continue
        unresolved.push(...addRefsToSectionMap(bySection, subRoute.sectionTitle, sub.lines))
      }
      continue
    }

    unresolved.push(...addRefsToSectionMap(bySection, route.sectionTitle, lines))

    for (const sub of topic.subsections ?? []) {
      const subRoute = routeJayAdamsTopic(sub.label, sub.lines)
      if (subRoute.kind !== 'section') continue
      unresolved.push(...addRefsToSectionMap(bySection, subRoute.sectionTitle, sub.lines))
    }
  }

  return { bySection, unresolved: [...new Set(unresolved)] }
}
