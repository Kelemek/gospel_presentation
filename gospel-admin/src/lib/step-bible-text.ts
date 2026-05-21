import type { StepBibleLanguage, StepBibleWord } from '@/lib/step-bible-types'

/** True when a STEP word field looks like dStrongs (H/G codes), not an English gloss. */
export function looksLikeStepStrongsField(value: string): boolean {
  const s = value.trim()
  if (!s) return false
  return /(?:\{[HG]\d|\b[HG]\d|H90\d{2})/i.test(s)
}

/** STEP Hebrew morphology tag (col5 in TAHOT), e.g. HPp2ms or HR/Vqcc — not an English gloss. */
export function looksLikeHebrewMorphCode(value: string): boolean {
  const s = value.trim()
  if (!s || /\s/.test(s)) return false
  return /^H?[A-Z][A-Za-z0-9]*(\/[A-Z][A-Za-z0-9]*)*$/.test(s)
}

/**
 * Correct legacy Hebrew imports that swapped English gloss and dStrongs columns.
 * Greek rows are unchanged when fields are already in the right slots.
 */
export function normalizeStepBibleWordFields(word: StepBibleWord): StepBibleWord {
  const strongs = (word.strongs ?? '').trim()
  const gloss = (word.gloss ?? '').trim()
  if (!looksLikeStepStrongsField(strongs) && looksLikeStepStrongsField(gloss)) {
    return { ...word, strongs: gloss, gloss: strongs || word.gloss }
  }
  return word
}

/** Chip label: primary Strong’s key (H430 / G3100); title keeps full STEP dStrongs when different. */
export function formatStrongsChipLabel(strongs: string): { primary: string; title?: string } {
  const raw = strongs.trim()
  const key = normalizeStrongsForLookup(raw)?.key
  if (key && key !== raw) return { primary: key, title: raw }
  return { primary: raw }
}

/** Strip STEPBible HTML-ish markup for plain-text display. */
export function stripStepBibleMarkup(html: string): string {
  const text = html
    // Bracketed apparatus links: [<a title="...">Refs...</a>] → remove whole bracket
    .replace(/\[\s*<a\b[^>]*>[\s\S]*?<\/a>\s*\]/gi, '')
    // Scripture refs: <ref='Rev.21.6'>Rev.21:6</ref> → Rev 21:6
    .replace(/<ref='([^']+)'>[^<]*<\/ref>/gi, (_, ref: string) =>
      ref.replace(/\./g, ' ').trim()
    )
    // Remaining hover/citation links (LSJ apparatus)
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<\/?Level\d+>/gi, '')
    .replace(/<\/?re>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    // Scholarly apparatus brackets not useful in-app
    .replace(/\[Refs[^\]]*\]/gi, '')
    .replace(/\[in LXX[^\]]*\]/gi, '')
    .replace(/\[see\.[^\]]*\]/gi, '')
    // STEPBible outline prefixes: __1. __(a) __II __2.b
    .replace(/__+(\d+\.)/g, '\n$1')
    .replace(/__+\(([a-z])\)/gi, '($1)')
    .replace(/__+(I{1,3}(?:\.\d+)?(?:\.[a-z])?)/gi, '\n$1')
    .replace(/__+/g, '')
    // Empty brackets left after removing apparatus (e.g. -σω[] or "word []")
    .replace(/\[\s*\]/g, '')
    .replace(/\[\s*[,;:.\s-]*\s*\]/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/;\s*;+/g, ';')
    .replace(/\s+([,.;:])/g, '$1')
    // LSJ grammar labels often abut after apparatus removal: -σωaorist → -σω aorist
    .replace(
      /(\S)(?=(?:aorist|passive|middle|future|perfect|poetry|present|imperative|infinitive|participle)\b)/gi,
      '$1 '
    )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  return text
}

/** Parse "καὶ (kai)" or bare Greek/Hebrew token. */
export function parseSurfaceAndTransliteration(cell: string): {
  text: string
  transliteration?: string
} {
  const trimmed = cell.trim()
  const m = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (m) {
    return { text: m[1].trim(), transliteration: m[2].trim() }
  }
  return { text: trimmed }
}

/** G3339=V-PPM-2P or {H0430G} → strongs + morph */
export function parseStrongsAndMorph(dStrongs: string): { strongs: string; morph?: string } {
  const raw = dStrongs.trim()
  const g = raw.match(/(G\d{1,5}[A-Z]?)/i)
  if (g) {
    const code = g[1].toUpperCase()
    const morphPart = raw.includes('=') ? raw.split('=').slice(1).join('=') : undefined
    return { strongs: normalizeGreekStrongs(code), morph: morphPart || undefined }
  }
  const hMatches = [...raw.matchAll(/H(\d{1,5}[A-Z]?)/gi)]
  if (hMatches.length > 0) {
    const last = hMatches[hMatches.length - 1][0]
    const morphPart = raw.includes('/') ? undefined : raw.match(/H[A-Z0-9]+=([^\s/]+)/)?.[1]
    return { strongs: normalizeHebrewStrongs(last), morph: morphPart }
  }
  return { strongs: raw }
}

export function normalizeGreekStrongs(code: string): string {
  const m = code.match(/^G(\d+)/i)
  if (!m) return code
  return `G${parseInt(m[1], 10)}`
}

export function normalizeHebrewStrongs(code: string): string {
  const m = code.match(/^H(\d+)/i)
  if (!m) return code.toUpperCase()
  return `H${parseInt(m[1], 10)}`
}

/** STEP Hebrew morphology prefixes (H9001–H9099) — not in TBESH; skip for lexicon. */
function isStepHebrewMorphPrefix(code: string): boolean {
  return /^H90\d{2}$/.test(code)
}

/**
 * Pick the dictionary Strong’s from a STEP Hebrew dStrongs field.
 * Prefer braced lemmas `{H0413}` over suffix codes like `H9014` or prefixes `H9002`.
 */
export function parseLexiconHebrewStrongs(dStrongs: string): string | null {
  const raw = dStrongs.trim()
  if (!raw) return null

  const braced = [...raw.matchAll(/\{H(\d{1,5}[A-Z]?)/gi)]
  if (braced.length) {
    return normalizeHebrewStrongs(`H${braced[braced.length - 1][1]}`)
  }

  const hAll = [...raw.matchAll(/H(\d{1,5}[A-Z]?)/gi)]
  for (let i = hAll.length - 1; i >= 0; i--) {
    const code = normalizeHebrewStrongs(`H${hAll[i][1]}`)
    if (!isStepHebrewMorphPrefix(code)) return code
  }
  if (hAll.length) {
    return normalizeHebrewStrongs(`H${hAll[hAll.length - 1][1]}`)
  }
  return null
}

/** All TBESH lookup keys to try, best first (braced lemma, then content words, then morphology). */
export function hebrewLexiconLookupKeys(dStrongs: string): string[] {
  const keys: string[] = []
  const add = (code: string) => {
    const k = normalizeHebrewStrongs(code.startsWith('H') ? code : `H${code}`)
    if (k.startsWith('H') && !keys.includes(k)) keys.push(k)
  }

  for (const m of dStrongs.matchAll(/\{H(\d{1,5}[A-Z]?)/gi)) add(`H${m[1]}`)
  for (const m of dStrongs.matchAll(/H(\d{1,5}[A-Z]?)/gi)) {
    const k = normalizeHebrewStrongs(`H${m[1]}`)
    if (!isStepHebrewMorphPrefix(k)) add(k)
  }
  for (const m of dStrongs.matchAll(/H(\d{1,5}[A-Z]?)/gi)) add(`H${m[1]}`)

  return keys
}

/** Client-safe Strong’s key for lexicon API (handles STEP compound fields). */
export function normalizeStrongsForLookup(strongs: string): {
  language: StepBibleLanguage
  key: string
} | null {
  const raw = strongs.trim()
  if (!raw) return null

  const parsed = parseStrongsAndMorph(raw)
  const parsedKey = parsed.strongs.trim().toUpperCase()
  if (parsedKey.startsWith('G')) {
    return { language: 'grc', key: normalizeGreekStrongs(parsedKey) }
  }

  const hebKey = parseLexiconHebrewStrongs(raw)
  if (hebKey) {
    return { language: 'heb', key: hebKey }
  }

  const s = raw.toUpperCase()
  if (s.startsWith('G')) {
    return { language: 'grc', key: normalizeGreekStrongs(s) }
  }
  return null
}

/** Ἀβραάμ=Abraham → gloss */
export function parseDictionaryGloss(cell: string): { lemma?: string; gloss?: string } {
  const idx = cell.indexOf('=')
  if (idx === -1) return {}
  return {
    lemma: cell.slice(0, idx).trim() || undefined,
    gloss: cell.slice(idx + 1).trim() || undefined,
  }
}
