/**
 * Parse CCEL ThML `morneve.xml` into per-day gospel profiles (Morning + Evening subsections).
 */
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { morneveMmddFromDiv2Id, morneveSlugForMmdd, morneveTitleForMmdd } from '@/lib/spurgeon/morneveSlug'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'

export const CCEL_MORNEVE_XML_URL = 'https://www.ccel.org/ccel/spurgeon/morneve.xml'

export interface ParsedCcelMorneveDay {
  mmdd: string
  slug: string
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

type ReadingHalf = 'am' | 'pm'

interface Div2Block {
  mmdd: string
  half: ReadingHalf
  divInner: string
  readingTitle: string
}

/** Split ThML body on top-level `<div2>...</div2>` blocks. */
export function extractDiv2Blocks(xml: string): string[] {
  const blocks: string[] = []
  const lower = xml
  let pos = 0
  while (pos < lower.length) {
    const start = lower.indexOf('<div2', pos)
    if (start === -1) break
    let depth = 0
    let i = start
    while (i < lower.length) {
      if (lower.slice(i, i + 5).toLowerCase() === '<div2') {
        const gt = lower.indexOf('>', i)
        if (gt === -1) break
        depth++
        i = gt + 1
        continue
      }
      if (lower.slice(i, i + 7).toLowerCase() === '</div2>') {
        depth--
        i += 7
        if (depth === 0) {
          blocks.push(xml.slice(start, i))
          pos = i
          break
        }
        continue
      }
      i++
    }
    if (i >= lower.length) break
  }
  return blocks
}

function parseDiv2Block(block: string): Div2Block | null {
  const idMatch = block.match(/<div2\b[^>]*\bid="([^"]+)"/i)
  const titleMatch = block.match(/<div2\b[^>]*\btitle="([^"]*)"/i)
  if (!idMatch?.[1]) return null
  const mmdd = morneveMmddFromDiv2Id(idMatch[1])
  if (!mmdd) return null
  const half = idMatch[1].toLowerCase().endsWith('pm') ? 'pm' : 'am'
  const innerMatch = block.match(/<div2\b[^>]*>([\s\S]*)<\/div2>\s*$/i)
  const divInner = innerMatch ? innerMatch[1] : block.replace(/^<div2\b[^>]*>/i, '').replace(/<\/div2>\s*$/i, '')
  return {
    mmdd,
    half,
    divInner,
    readingTitle: titleMatch?.[1]?.trim() || `${half === 'am' ? 'Morning' : 'Evening'}, ${morneveTitleForMmdd(mmdd)}`,
  }
}

/** Convert one reading's inner XML to subsection HTML (`<p>` blocks, inline scripture refs). */
export function div2InnerToSubsectionHtml(divInner: string): string {
  let s = divInner
  s = s.replace(/<p\b[^>]*class="crossref"[^>]*>[\s\S]*?<\/p>/gi, '')
  s = s.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, '')
  s = s.replace(/<a\b[^>]*\/>/gi, '')
  s = s.replace(/<sync\b[^>]*\/>/gi, '')

  const parts: string[] = []
  const blockRe = /<(p|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(s)) !== null) {
    const inner = m[2].trim()
    if (!inner || inner === '&#160;' || inner === '&nbsp;') continue
    const contentHtml = unwrapScripRefTags(inner).trim()
    if (!contentHtml) continue
    parts.push(`<p>${contentHtml}</p>`)
  }

  return parts.join('\n')
}

function subsectionFromDiv2(block: Div2Block): Subsection | null {
  const content = div2InnerToSubsectionHtml(block.divInner)
  if (!content.trim()) return null
  return {
    title: block.half === 'am' ? 'Morning' : 'Evening',
    content,
    questions: [],
  }
}

function passageRefsFromDay(amInner: string, pmInner: string): string[] {
  const raw: string[] = []
  for (const frag of [amInner, pmInner]) {
    raw.push(...extractPassageAttributes(frag))
  }
  return raw.map((r) => normalizedPassageDisplayForInline(r))
}

export function parseCcelMorneveXml(xml: string, options?: { limit?: number }): ParsedCcelMorneveDay[] {
  const limit = options?.limit ?? 9999
  const byDay = new Map<string, { am?: Div2Block; pm?: Div2Block }>()

  for (const block of extractDiv2Blocks(xml)) {
    const parsed = parseDiv2Block(block)
    if (!parsed) continue
    let entry = byDay.get(parsed.mmdd)
    if (!entry) {
      entry = {}
      byDay.set(parsed.mmdd, entry)
    }
    if (parsed.half === 'am') entry.am = parsed
    else entry.pm = parsed
  }

  const days: ParsedCcelMorneveDay[] = []
  const sortedMmdd = [...byDay.keys()].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

  for (const mmdd of sortedMmdd) {
    if (days.length >= limit) break
    const { am, pm } = byDay.get(mmdd)!
    if (!am || !pm) continue

    const morning = subsectionFromDiv2(am)
    const evening = subsectionFromDiv2(pm)
    if (!morning || !evening) continue

    const slug = morneveSlugForMmdd(mmdd)
    const title = morneveTitleForMmdd(mmdd)
    const gospelSection: GospelSection = {
      section: slug,
      title,
      subsections: [morning, evening],
    }

    const gospelData: GospelPresentationData = [gospelSection]
    const fromHtml = passageKeysFromRefs(passageRefsFromDay(am.divInner, pm.divInner))
    const fromStored = passageKeysFromGospelPresentationData(gospelData)
    const passageKeySet = new Set([...fromHtml, ...fromStored])
    const passageKeys = [...passageKeySet]

    days.push({
      mmdd,
      slug,
      title,
      gospelSection,
      passageKeys,
    })
  }

  return days
}
