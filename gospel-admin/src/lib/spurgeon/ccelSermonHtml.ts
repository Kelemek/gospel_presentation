/**
 * Convert CCEL ThML sermon `div1` XML blocks into GospelPresentationData subsections.
 *
 * CCEL’s Spurgeon volumes encode each sermon as one `<div1 title="…">` (that attribute is
 * the sermon title on the Gospel section). Inside the sermon, outline and prose are almost
 * entirely `<p class="Body">…</p>` — there are typically no per-point `<head>` / `<div2>`
 * wrappers in the XML, so structure is inferred from paragraph text (Roman heads, FIRST.,
 * and numbered **1.** … **2.** lines).
 *
 * `scripRef` → passage text normalized so {@link injectGospelInlineMarkersInHtml} can turn refs into
 * scripture modal triggers; **`scripCom`** footnotes removed. Subsections do **not** duplicate refs in
 * `scriptureReferences` — only inline body text carries them.
 */
import type { GospelSection, NestedSubsection, Subsection } from '@/lib/types'
import { bookNameToUsfm, canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { GOSPEL_BIBLE_BOOK_NAMES } from '@/lib/gospelBibleBookNames'
import { parseReference } from '@/lib/parse-scripture-reference'

const MAX_NAV_TITLE_LEN = 52

/**
 * Typical CCEL / ThML abbreviated book forms in passage="…" — values are spelled so
 * {@link bookNameToUsfm} resolves.
 */
const THML_BOOK_ABBREV_TO_BOOK_ALIAS: Record<string, string> = {
  rom: 'romans',
  rm: 'romans',
  jn: 'john',
  jhn: 'john',
  lk: 'luke',
  mk: 'mark',
  mt: 'matthew',
  ps: 'psalm',
  pss: 'psalms',
  ex: 'exodus',
  exo: 'exodus',
  gn: 'genesis',
  gen: 'genesis',
  lev: 'leviticus',
  lv: 'leviticus',
  nm: 'numbers',
  nu: 'numbers',
  dt: 'deuteronomy',
  deu: 'deuteronomy',
  josh: 'joshua',
  jdg: 'judges',
  '1sam': '1 samuel',
  '2sam': '2 samuel',
  '1ki': '1 kings',
  '2ki': '2 kings',
  '1chr': '1 chronicles',
  '2chr': '2 chronicles',
  isa: 'isaiah',
  jer: 'jeremiah',
  lam: 'lamentations',
  ezek: 'ezekiel',
  ezk: 'ezekiel',
  dan: 'daniel',
  hos: 'hosea',
  joel: 'joel',
  am: 'amos',
  obad: 'obadiah',
  jon: 'jonah',
  nah: 'nahum',
  hab: 'habakkuk',
  zeph: 'zephaniah',
  mic: 'micah',
  zech: 'zechariah',
  mal: 'malachi',
  gal: 'galatians',
  eph: 'ephesians',
  php: 'philippians',
  col: 'colossians',
  tit: 'titus',
  phm: 'philemon',
  phlm: 'philemon',
  heb: 'hebrews',
  jam: 'james',
  jas: 'james',
  rev: 'revelation',
  apoc: 'revelation',
}

/** Map a book string that {@link bookNameToUsfm} accepts to canonical Gospel-present display name (USFM-aligned). */
function gospelCanonicalBookDisplay(bookRawThatResolves: string): string | null {
  const usfm = bookNameToUsfm(bookRawThatResolves)
  if (!usfm) return null
  for (const name of GOSPEL_BIBLE_BOOK_NAMES) {
    if (bookNameToUsfm(name) === usfm) return name
  }
  return null
}

function canonicalBookCandidateFromFragment(bookFragment: string): string | null {
  const t = bookFragment.trim()
  if (!t) return null
  if (bookNameToUsfm(t)) return t.replace(/\s+/g, ' ')
  const ab = THML_BOOK_ABBREV_TO_BOOK_ALIAS[t.toLowerCase().replace(/\./g, '')]
  return ab ?? null
}

/**
 * Turn ThML passage="john 8:58" / "Rom 8:28" into display text injectGospelInlineMarkersInHtml recognizes
 * ("John 8:58", "Romans 8:28"). Used in stored sermon HTML and for passage-key indexing.
 */
export function normalizedPassageDisplayForInline(passage: string): string {
  const trimmed = passage.replace(/\s+/g, ' ').trim()
  if (!trimmed) return trimmed

  const parsed = parseReference(trimmed.replace(/–/g, '-'))
  if (!parsed) return trimmed

  const candidate = canonicalBookCandidateFromFragment(parsed.book)
  const displayBook = candidate ? gospelCanonicalBookDisplay(candidate) : null
  const bookOut =
    displayBook ??
    `${parsed.book
      .split(/\s+/g)
      .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ')}`

  const { chapter, verseStart, verseEnd } = parsed
  if (verseStart === null) return `${bookOut} ${chapter}`
  if (verseEnd !== null && verseEnd !== verseStart) return `${bookOut} ${chapter}:${verseStart}-${verseEnd}`
  return `${bookOut} ${chapter}:${verseStart}`
}

const SCRIPREF_BLOCK_RE = /<scripRef\b([^>]*)>([\s\S]*?)<\/scripRef>/gi

function stripScripInnerToPlain(inner: string): string {
  return inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Expand each `scripRef` to canonical inline reference text (`passage="…"` wins over inner markup).
 */
export function expandScripRefsToInlinePlain(innerXml: string): string {
  return innerXml.replace(SCRIPREF_BLOCK_RE, (_full, attrs, inner) => {
    const pm = /\bpassage="([^"]+)"/i.exec(String(attrs))
    if (pm?.[1]) return normalizedPassageDisplayForInline(pm[1])
    const plain = stripScripInnerToPlain(String(inner))
    return plain ? normalizedPassageDisplayForInline(plain) : plain
  })
}

/** Strip ThML wrappers: `scripRef` → normalized passage text; remove `scripCom` markers. */
export function unwrapScripRefTags(innerXml: string): string {
  return expandScripRefsToInlinePlain(innerXml)
    .replace(/<scripCom\b[^/>]*\/>/gi, '')
    .replace(/<scripCom\b[^>]*><\/scripCom>/gi, '')
}

/** Extract passage="..." from scripRef / scripCom in a fragment. */
export function extractPassageAttributes(fragment: string): string[] {
  const out: string[] = []
  const re = /(?:scripRef|scripCom)\b[^>]*\bpassage="([^"]+)"/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(fragment)) !== null) {
    const p = m[1].trim()
    if (p) out.push(p)
  }
  return out
}

function stripTagsToPlain(html: string): string {
  return unwrapScripRefTags(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function navTitleFromParagraphHtml(pHtml: string, index: number): string {
  const plain = stripTagsToPlain(pHtml)
  if (!plain) return `Part ${index + 1}`
  if (plain.length <= MAX_NAV_TITLE_LEN) return plain
  return `${plain.slice(0, MAX_NAV_TITLE_LEN - 1)}…`
}

/** Roman II–XIV, disambiguated Roman I., or FIRST./SECOND. — top-level subsection boundaries only. */
export function isMajorOutlineSegmentStart(plain: string): boolean {
  const t = plain.replace(/^\s+/, '').trimStart()
  if (!t) return false

  if (/^(II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV)\.\s+/i.test(t)) return true

  if (
    /^I\.\s+(First|Second|Third|Fourth|Fifth|Sixth|Seventh|The\s|We\s|My\s|Here\s|Now\s|But\s|It\s|He\s|They\s|God\s|This\s|There\s|When\s|If\s|Let\s|Some\s|All\s|Ye\s|You\s|Our\s|A\s|An\s|\d)/i.test(
      t
    )
  ) {
    return true
  }

  if (/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH)\.\s/i.test(t)) return true
  return false
}

/**
 * Numbered outline under a major head (e.g. "1. I shall …", "3. Then again …", "2. By …")
 * → nested subsection. Spurgeon uses many openers beyond a fixed word list; any **1–2**
 * digit index followed by a period, space, and non-space is treated as a subpoint start.
 */
export function isNumberedSubpointStart(plain: string): boolean {
  const t = plain.replace(/^\s+/, '').trimStart()
  if (!t) return false
  return /^\d{1,2}\.\s+\S/.test(t)
}

/** Major or numbered outline start (useful for tests / tooling). */
export function isOutlineSegmentStart(plain: string): boolean {
  return isMajorOutlineSegmentStart(plain) || isNumberedSubpointStart(plain)
}

function extractBodyParagraphInners(divInner: string): string[] {
  const pRe = /<p\b[^>]*class="Body"[^>]*>([\s\S]*?)<\/p>/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = pRe.exec(divInner)) !== null) {
    const inner = m[1].trim()
    if (!inner || inner === '&#160;' || inner === '&nbsp;') continue
    out.push(inner)
  }
  return out
}

function groupInnersByMajorOutline(inners: string[]): string[][] {
  if (inners.length === 0) return []
  const groups: string[][] = []
  let current: string[] = []

  for (const inner of inners) {
    const plain = stripTagsToPlain(inner)
    if (current.length > 0 && isMajorOutlineSegmentStart(plain)) {
      groups.push(current)
      current = [inner]
    } else {
      current.push(inner)
    }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

/** Within one major block: paragraphs before first "1." / "2." …, then each numbered run. */
function splitMajorIntoLeadingAndNumbered(majorInners: string[]): {
  leading: string[]
  nestedGroups: string[][]
} {
  const numberedIndices: number[] = []
  majorInners.forEach((inner, i) => {
    if (isNumberedSubpointStart(stripTagsToPlain(inner))) numberedIndices.push(i)
  })
  if (numberedIndices.length === 0) {
    return { leading: majorInners, nestedGroups: [] }
  }
  const firstNum = numberedIndices[0]!
  const leading = majorInners.slice(0, firstNum)
  const nestedGroups: string[][] = []
  for (let n = 0; n < numberedIndices.length; n++) {
    const start = numberedIndices[n]!
    const end = n + 1 < numberedIndices.length ? numberedIndices[n + 1]! : majorInners.length
    nestedGroups.push(majorInners.slice(start, end))
  }
  return { leading, nestedGroups }
}

function mergeInnersToHtml(inners: string[]): string {
  const parts: string[] = []
  for (const inner of inners) {
    const contentHtml = unwrapScripRefTags(inner).trim()
    if (!contentHtml) continue
    parts.push(`<p>${contentHtml}</p>`)
  }
  return parts.join('\n')
}

function subsectionFromParagraphGroup(groupInners: string[], outlineIndex: number): Subsection | null {
  const content = mergeInnersToHtml(groupInners)
  if (!content) return null
  const titleSource = groupInners[0] ?? ''
  return {
    title: navTitleFromParagraphHtml(titleSource, outlineIndex),
    content,
    questions: [],
  }
}

function nestedSubsectionFromNumberedGroup(groupInners: string[], nestedIndex: number): NestedSubsection | null {
  const content = mergeInnersToHtml(groupInners)
  if (!content) return null
  const titleSource = groupInners[0] ?? ''
  return {
    title: navTitleFromParagraphHtml(titleSource, nestedIndex),
    content,
    questions: undefined,
  }
}

function subsectionFromMajorGroup(majorInners: string[], majorIndex: number): Subsection | null {
  if (majorInners.length === 0) return null

  const { leading, nestedGroups } = splitMajorIntoLeadingAndNumbered(majorInners)
  if (nestedGroups.length === 0) {
    return subsectionFromParagraphGroup(majorInners, majorIndex)
  }

  const nestedSubsections: NestedSubsection[] = []
  for (let i = 0; i < nestedGroups.length; i++) {
    const nested = nestedSubsectionFromNumberedGroup(nestedGroups[i]!, i)
    if (nested) nestedSubsections.push(nested)
  }
  if (nestedSubsections.length === 0) {
    return subsectionFromParagraphGroup(majorInners, majorIndex)
  }

  const content = mergeInnersToHtml(leading)
  const titleSource = majorInners[0] ?? ''
  return {
    title: navTitleFromParagraphHtml(titleSource, majorIndex),
    content,
    nestedSubsections,
    questions: [],
  }
}

/** Parse "(No. 12)" style sermon number from early body paragraphs. */
export function extractSermonCatalogNumber(divInner: string): number | null {
  const m = divInner.match(/\(No\.\s*(\d+)\)/i)
  if (!m) return null
  return parseInt(m[1], 10)
}

export function slugForSermonNumber(n: number): string {
  const padded = String(n).padStart(5, '0')
  return `sg${padded}`
}

/**
 * Split a single sermon div1 inner XML into subsections by **major** homiletical outline
 * (Roman I.–XIV., FIRST./SECOND., …). Numbered points (**1.**, **2.**, …) under each major
 * head become **`nestedSubsections`**; paragraphs before the first **1.** stay in the parent
 * `content` (opening of that division).
 */
export function div1XmlToGospelSubsections(divInner: string): {
  subsections: Subsection[]
  allPassages: string[]
  sermonNo: number | null
} {
  const sermonNo = extractSermonCatalogNumber(divInner)
  const inners = extractBodyParagraphInners(divInner)
  const majorGroups = groupInnersByMajorOutline(inners)
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  majorGroups.forEach((group, idx) => {
    for (const inner of group) {
      allPassages.push(...extractPassageAttributes(inner))
    }
    const sub = subsectionFromMajorGroup(group, idx)
    if (sub) subsections.push(sub)
  })

  return { subsections, allPassages, sermonNo }
}

export function passageKeysFromRefs(refs: string[]): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const r of refs) {
    const k = canonicalScriptureCacheReference(r)
    if (!k || seen.has(k)) continue
    seen.add(k)
    keys.push(k)
  }
  return keys
}

export interface ParsedCcelSermonDiv1 {
  /** div1 @title */
  sermonTitle: string
  /** Raw inner XML of div1 (for re-parsing if needed) */
  divInner: string
  sermonNo: number | null
  slug: string
  gospelSection: GospelSection
  passageKeys: string[]
}

/** Split ThML body on top-level `<div1>...</div1>` sermon blocks (handles nested div1 if present). */
export function extractDiv1Blocks(xml: string): string[] {
  const blocks: string[] = []
  const lower = xml
  let pos = 0
  while (pos < lower.length) {
    const start = lower.indexOf('<div1', pos)
    if (start === -1) break
    let depth = 0
    let i = start
    while (i < lower.length) {
      if (lower.slice(i, i + 5).toLowerCase() === '<div1') {
        const gt = lower.indexOf('>', i)
        if (gt === -1) break
        depth++
        i = gt + 1
        continue
      }
      if (lower.slice(i, i + 7).toLowerCase() === '</div1>') {
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

export function parseCcelVolumeSermons(xml: string, options?: { limit?: number }): ParsedCcelSermonDiv1[] {
  const limit = options?.limit ?? 5
  const sermons: ParsedCcelSermonDiv1[] = []
  const blocks = extractDiv1Blocks(xml)

  for (const block of blocks) {
    if (sermons.length >= limit) break
    const titleMatch = block.match(/<div1\b[^>]*\btitle="([^"]*)"/i)
    const sermonTitle = titleMatch?.[1]?.trim() || `Sermon ${sermons.length + 1}`
    const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
    const divInner = innerMatch ? innerMatch[1] : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')

    const { subsections, allPassages, sermonNo } = div1XmlToGospelSubsections(divInner)
    if (subsections.length === 0) continue

    const n = sermonNo ?? sermons.length + 1
    const slug = slugForSermonNumber(n)
    const passageKeys = passageKeysFromRefs(
      allPassages.map((raw) => normalizedPassageDisplayForInline(raw))
    )

    const gospelSection: GospelSection = {
      section: slug,
      title: sermonTitle,
      subsections,
    }

    sermons.push({
      sermonTitle,
      divInner,
      sermonNo,
      slug,
      gospelSection,
      passageKeys,
    })
  }

  return sermons
}
