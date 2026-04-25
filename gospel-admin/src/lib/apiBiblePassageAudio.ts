import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import type { ApiBibleTranslation } from '@/lib/bible-translations'
import { parseReference } from '@/lib/parse-scripture-reference'

const API_BIBLE_ID_ENV: Record<ApiBibleTranslation, string> = {
  kjv: 'API_BIBLE_BIBLE_ID_KJV',
  nasb: 'API_BIBLE_BIBLE_ID_NASB',
  lsb: 'API_BIBLE_BIBLE_ID_LSB',
  niv: 'API_BIBLE_BIBLE_ID_NIV',
  nlt: 'API_BIBLE_BIBLE_ID_NLT',
  csb: 'API_BIBLE_BIBLE_ID_CSB',
}

type BibleMetaResponse = {
  data?: {
    id?: string
    dblId?: string
    name?: string
    nameLocal?: string
    abbreviation?: string
    abbreviationLocal?: string
    audioBibles?: Array<{ id?: string }>
  }
}

type AudioBibleListRow = {
  id?: string
  type?: string
  abbreviation?: string
  abbreviationLocal?: string
  name?: string
  nameLocal?: string
  dblId?: string
}

type AudioBibleListResponse = {
  data?: AudioBibleListRow[]
}

type AudioChapterResponse = {
  data?: {
    resourceUrl?: string
  }
}

type AudioBookChaptersListResponse = {
  data?: Array<{
    id?: string
    number?: string
    bookId?: string
  }>
}

function uniqueIds(ids: Array<string | undefined | null>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

function embeddedAudioBibleIds(bibleJson: BibleMetaResponse): string[] {
  const embedded = bibleJson?.data?.audioBibles
  if (!Array.isArray(embedded)) return []
  return uniqueIds(embedded.map((e) => e?.id).filter((x): x is string => Boolean(x)))
}

/**
 * `GET /v1/audio-bibles?bibleId=` — per OpenAPI, filter by related text `bibleId`.
 * Prefer `type: "audio"`; if the API returns rows with missing/mis-typed `type` (empty strict list),
 * fall back to any `id` other than the text edition id (runtime evidence: CSB had 0 strict matches but needs audio id).
 */
function listAudioBibleIdsFromListJson(
  listJson: AudioBibleListResponse,
  textBibleId: string
): string[] {
  const rows = listJson?.data
  if (!Array.isArray(rows) || rows.length === 0) return []

  const pass = (r: { id?: string; type?: string } | undefined) => {
    if (!r?.id) return false
    if (r.type === 'text') return false
    return r.type === 'audio' || r.type == null
  }
  const primary = rows.filter((r) => r?.id && r?.type === 'audio').map((r) => r!.id!)
  const rest = rows
    .filter((r) => {
      const id = r?.id
      return id != null && !primary.includes(id) && pass(r)
    })
    .map((r) => r!.id!)
  const strict = uniqueIds([...primary, ...rest])
  if (strict.length > 0) return strict

  const loose = rows
    .map((r) => r?.id)
    .filter((id): id is string => Boolean(id) && id !== textBibleId)
  return uniqueIds(loose)
}

async function fetchListAudioBibleIds(
  base: string,
  apiKey: string,
  textBibleId: string
): Promise<string[]> {
  /** List Audio Bibles accepts `bibleId` (+ filters); `limit`/`offset` are not in the public schema and return 400 on rest.api.bible. */
  const listUrl = `${base}/v1/audio-bibles?${new URLSearchParams({ bibleId: textBibleId })}`
  const listRes = await fetch(listUrl, { headers: { 'api-key': apiKey } })
  if (!listRes.ok) {
    return []
  }
  const listJson = (await listRes.json()) as AudioBibleListResponse
  return listAudioBibleIdsFromListJson(listJson, textBibleId)
}

/**
 * When `?bibleId=` returns no usable ids, OpenAPI also supports
 * `GET /v1/audio-bibles?language=eng&abbreviation=…` to discover audio Bible ids.
 */
async function searchAudioBibleIdsByAbbreviation(
  base: string,
  apiKey: string,
  abbrev: string,
  textBibleId: string
): Promise<string[]> {
  const q = abbrev.trim()
  if (!q) return []

  const listUrl = `${base}/v1/audio-bibles?${new URLSearchParams({ language: 'eng', abbreviation: q })}`
  const listRes = await fetch(listUrl, { headers: { 'api-key': apiKey } })
  if (!listRes.ok) return []
  const listJson = (await listRes.json()) as AudioBibleListResponse
  return listAudioBibleIdsFromListJson(listJson, textBibleId)
}

/** OpenAPI: `name` search on `GET /v1/audio-bibles`. */
async function searchAudioBibleIdsByName(
  base: string,
  apiKey: string,
  name: string,
  textBibleId: string
): Promise<string[]> {
  const q = name.trim().slice(0, 80)
  if (q.length < 2) return []
  const listUrl = `${base}/v1/audio-bibles?${new URLSearchParams({ language: 'eng', name: q })}`
  const listRes = await fetch(listUrl, { headers: { 'api-key': apiKey } })
  if (!listRes.ok) return []
  const listJson = (await listRes.json()) as AudioBibleListResponse
  return listAudioBibleIdsFromListJson(listJson, textBibleId)
}

function uniqueAbbrevSearchQueries(d: BibleMetaResponse['data'] | undefined): string[] {
  if (!d) return []
  const out: string[] = []
  const loc = d.abbreviationLocal?.trim()
  const ab = d.abbreviation?.trim()
  if (loc) out.push(loc)
  if (ab) out.push(ab)
  if (ab && /^eng/i.test(ab) && ab.length > 3) {
    const rest = ab.replace(/^eng/i, '')
    if (rest) out.push(rest)
  }
  return uniqueIds(out)
}

function uniqueNameSearchQueries(d: BibleMetaResponse['data'] | undefined): string[] {
  if (!d) return []
  const out: string[] = []
  if (d.nameLocal?.trim()) out.push(d.nameLocal.trim().slice(0, 64))
  if (d.name?.trim()) out.push(d.name.slice(0, 64))
  return uniqueIds(out)
}

/**
 * If targeted searches return nothing, list all `language=eng` audio bibles and pick rows
 * whose abbreviation fields match the text edition (runtime: CSB search-by-one-abbrev returned 0).
 */
function normAbbrevKey(s: string | undefined | null): string {
  if (!s) return ''
  return s.trim().replace(/^eng/i, '').toLowerCase()
}

function sortLetters(s: string): string {
  return s.split('').sort().join('')
}

/** `engcbs1da` does not include substring "csb" (it has "cbs") — use sorted-letter match on letter-only windows. */
function letterOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

function hasSameLettersWindow(hay: string, needle: string): boolean {
  if (needle.length < 2 || hay.length < needle.length) return false
  const n = sortLetters(needle)
  for (let i = 0; i + needle.length <= hay.length; i += 1) {
    if (sortLetters(hay.slice(i, i + needle.length)) === n) return true
  }
  return false
}

/**
 * Text edition (e.g. `abbreviationLocal: "CSB"`) and audio-bible list rows (e.g. `ENGCBS…`, `CBS`) often
 * do not share identical normalized strings, so the wide `language=eng` list can yield no abbreviation match
 * without substring / anagram fallbacks and optional row enrichment.
 */
function textEditionAbbrevMatchesRow(textKeys: string[], r: AudioBibleListRow): boolean {
  const fields: string[] = []
  for (const f of [r.abbreviation, r.abbreviationLocal]) {
    if (f) fields.push(f.trim().toLowerCase(), normAbbrevKey(f))
  }
  const rawLetters = letterOnly(`${r.abbreviation ?? ''} ${r.abbreviationLocal ?? ''}`)
  for (const tk of textKeys) {
    if (!tk) continue
    for (const f of fields) {
      if (!f) continue
      if (f === tk) return true
      if (f.includes(tk) || tk.includes(f)) return true
      if (tk.length >= 3 && f.length >= 3 && tk.length === f.length && tk.length <= 8 && sortLetters(tk) === sortLetters(f)) {
        return true
      }
    }
    if (tk.length >= 2 && rawLetters.includes(tk)) return true
    if (tk.length >= 3 && hasSameLettersWindow(rawLetters, tk)) return true
  }
  return false
}

function filterAudioBiblesByTextAbbrev(
  rows: AudioBibleListRow[] | undefined,
  d: BibleMetaResponse['data'] | undefined,
  textBibleId: string
): string[] {
  if (!Array.isArray(rows) || !d) return []
  const loc = d.abbreviationLocal?.trim()
  const ab = d.abbreviation?.trim()
  if (!loc && !ab) return []
  const textKeys = uniqueIds(
    [loc, ab, normAbbrevKey(loc), normAbbrevKey(ab)]
      .map((s) => (typeof s === 'string' && s ? s : ''))
      .map((s) => s.toLowerCase())
  ).filter((k) => k.length > 0)
  return uniqueIds(
    rows
      .filter((r) => {
        if (!r?.id || r.id === textBibleId) return false
        if (r.type === 'text') return false
        return textEditionAbbrevMatchesRow(textKeys, r)
      })
      .map((r) => r.id)
  )
}

function hasTextEditionAbbrev(d: BibleMetaResponse['data'] | undefined): boolean {
  return Boolean(d?.abbreviationLocal?.trim() || d?.abbreviation?.trim())
}

const NAME_MATCH_STOP = new Set(['bible', 'holy', 'the', 'and', 'of', 'for', 'a', 'an', 'in', 'to', 'is', 'on', 'at'])

/**
 * List responses often include `name` / `nameLocal` but not abbrevs; match distinctive edition words
 * (runtime: `fromWideFiltered: 0` with `wideRowsTotal: 2` for CSB/LSB).
 */
function filterAudioBiblesByTextName(
  rows: AudioBibleListRow[] | undefined,
  d: BibleMetaResponse['data'] | undefined,
  textBibleId: string
): string[] {
  if (!Array.isArray(rows) || !d) return []
  const edition = `${d.nameLocal ?? ''} ${d.name ?? ''}`.toLowerCase().replace(/\s+/g, ' ').trim()
  const words = edition
    .split(' ')
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 4 && !NAME_MATCH_STOP.has(w))
  const fromAbbrev = uniqueIds(
    [d.abbreviationLocal, d.abbreviation, normAbbrevKey(d.abbreviationLocal), normAbbrevKey(d.abbreviation)]
      .map((s) => (s ? letterOnly(s) : ''))
      .filter((s) => s.length >= 3 && s.length <= 10)
  )
  const needles = uniqueIds([...words, ...fromAbbrev])
  if (needles.length === 0) return []
  return uniqueIds(
    rows
      .filter((r) => {
        if (!r?.id || r.id === textBibleId) return false
        if (r.type === 'text') return false
        const rns = `${r.nameLocal ?? ''} ${r.name ?? ''}`.toLowerCase()
        if (rns.length < 3) return false
        return needles.some((n) => rns.includes(n))
      })
      .map((r) => r.id)
  )
}

function applyWideFilters(rows: AudioBibleListRow[] | undefined, d: BibleMetaResponse['data'] | undefined, textBibleId: string): string[] {
  if (!Array.isArray(rows) || !d) return []
  if (hasTextEditionAbbrev(d)) {
    const byAb = filterAudioBiblesByTextAbbrev(rows, d, textBibleId)
    if (byAb.length) return byAb
  }
  return filterAudioBiblesByTextName(rows, d, textBibleId)
}

/** When list rows omit abbreviations, `GET /v1/audio-bibles/{id}` returns full metadata. */
async function enrichAudioBibleListRows(
  base: string,
  apiKey: string,
  rows: AudioBibleListRow[]
): Promise<AudioBibleListRow[]> {
  const out: AudioBibleListRow[] = []
  for (const r of rows) {
    if (r.abbreviation || r.abbreviationLocal) {
      out.push(r)
      continue
    }
    if (!r.id) {
      out.push(r)
      continue
    }
    const res = await fetch(`${base}/v1/audio-bibles/${encodeURIComponent(r.id)}`, { headers: { 'api-key': apiKey } })
    if (!res.ok) {
      out.push(r)
      continue
    }
    const j = (await res.json()) as { data?: AudioBibleListRow }
    if (j.data && typeof j.data === 'object') {
      out.push({ ...r, ...j.data })
    } else {
      out.push(r)
    }
  }
  return out
}

/**
 * `GET /v1/audio-bibles?language=eng` — list endpoint does not support `limit`/`offset` in the documented
 * contract; those params can return 400 and empty discovery.
 * OpenAPI for another product listed limit/offset for *search*; do not send them here.
 */
async function listAllEnglishAudioBibleRows(
  base: string,
  apiKey: string
): Promise<{ rows: AudioBibleListRow[]; pages: number } | undefined> {
  const listUrl = `${base}/v1/audio-bibles?${new URLSearchParams({ language: 'eng' })}`
  const listRes = await fetch(listUrl, { headers: { 'api-key': apiKey } })
  if (!listRes.ok) {
    return undefined
  }
  const listJson = (await listRes.json()) as AudioBibleListResponse
  const rows = listJson.data
  if (!Array.isArray(rows)) return undefined
  return { rows, pages: 1 }
}

/**
 * Tries: multiple abbreviation query strings, name query, then full `language=eng` list
 * matched by abbreviation fields to the text Bible.
 */
async function discoverAudioBibleIdsFromTextMetadata(
  base: string,
  apiKey: string,
  textBibleId: string,
  d: BibleMetaResponse['data'] | undefined
): Promise<string[]> {
  for (const ab of uniqueAbbrevSearchQueries(d)) {
    const ids = await searchAudioBibleIdsByAbbreviation(base, apiKey, ab, textBibleId)
    if (ids.length) return ids
  }
  for (const nm of uniqueNameSearchQueries(d)) {
    const ids = await searchAudioBibleIdsByName(base, apiKey, nm, textBibleId)
    if (ids.length) return ids
  }
  const wideRes = await listAllEnglishAudioBibleRows(base, apiKey)
  const wide = wideRes?.rows
  let fromWide = applyWideFilters(wide, d, textBibleId)
  let merged: AudioBibleListRow[] | undefined
  if (fromWide.length === 0 && Array.isArray(wide) && wide.length > 0) {
    merged = await enrichAudioBibleListRows(base, apiKey, wide)
    fromWide = applyWideFilters(merged, d, textBibleId)
  }
  if (fromWide.length) return fromWide
  const dblSource = merged ?? wide
  if (d?.dblId && Array.isArray(dblSource)) {
    return uniqueIds(
      dblSource
        .filter(
          (r) =>
            r?.id &&
            r.id !== textBibleId &&
            r.type !== 'text' &&
            Boolean(r.dblId && d.dblId && r.dblId === d.dblId)
        )
        .map((r) => r.id!)
    )
  }
  return []
}

/**
 * If `GET /audio-bibles/.../chapters/{id}` 404s, OpenAPI also exposes
 * `GET /audio-bibles/.../books/{bookId}/chapters` — resolve the chapter `id` from that list
 * (same USFM as text; `number` matches the chapter).
 */
async function resolveChapterIdViaBookList(
  base: string,
  apiKey: string,
  audioBibleId: string,
  usfmBook: string,
  chapterNumber: number,
  constructedChapterId: string
): Promise<string | null> {
  const listUrl = `${base}/v1/audio-bibles/${encodeURIComponent(audioBibleId)}/books/${encodeURIComponent(usfmBook)}/chapters`
  const listRes = await fetch(listUrl, { headers: { 'api-key': apiKey } })
  if (!listRes.ok) return null
  const listJson = (await listRes.json()) as AudioBookChaptersListResponse
  const rows = listJson?.data
  if (!Array.isArray(rows) || rows.length === 0) return null

  const n = String(chapterNumber)
  const match =
    rows.find((c) => c.id === constructedChapterId) ??
    rows.find((c) => c.number === n && (c.bookId == null || c.bookId === usfmBook)) ??
    rows.find((c) => c.number === n)

  if (match?.id && match.id !== constructedChapterId) return match.id
  if (match?.id) return null
  return null
}

async function fetchAudioChapterResourceUrl(
  base: string,
  apiKey: string,
  audioBibleId: string,
  chapterId: string,
  usfmBook: string,
  chapterNumber: number
): Promise<string | null> {
  const getPayload = async (cid: string): Promise<string | null> => {
    const chapterUrl = `${base}/v1/audio-bibles/${encodeURIComponent(audioBibleId)}/chapters/${encodeURIComponent(cid)}`
    const chapterRes = await fetch(chapterUrl, { headers: { 'api-key': apiKey } })
    if (!chapterRes.ok) return null
    const chapterJson = (await chapterRes.json()) as AudioChapterResponse
    const resourceUrl = chapterJson?.data?.resourceUrl
    if (typeof resourceUrl !== 'string' || !resourceUrl.trim()) {
      return null
    }
    return resourceUrl
  }

  let url = await getPayload(chapterId)
  if (url) return url

  const resolved = await resolveChapterIdViaBookList(
    base,
    apiKey,
    audioBibleId,
    usfmBook,
    chapterNumber,
    chapterId
  )
  if (resolved) {
    url = await getPayload(resolved)
    if (url) return url
  }

  return null
}

async function tryAudioBibleIds(
  base: string,
  apiKey: string,
  chapterId: string,
  usfmBook: string,
  chapterNumber: number,
  ids: string[],
  tried: Set<string>
): Promise<string | null> {
  for (const id of ids) {
    if (tried.has(id)) continue
    tried.add(id)
    const url = await fetchAudioChapterResourceUrl(base, apiKey, id, chapterId, usfmBook, chapterNumber)
    if (url) return url
  }
  return null
}

/**
 * Resolves a time-limited MP3 URL for the chapter containing the passage.
 * Env `API_BIBLE_BIBLE_ID_*` is the **text** edition id for `/v1/bibles/...`. Audio uses
 * `GET /v1/audio-bibles/{audioBibleId}/chapters/...` where `audioBibleId` is often different;
 * we collect linked ids from metadata and list/discovery, then call the chapter endpoint per API.Bible.
 * @see https://api.bible/api-reference — “Audio Bibles” (GET `/v1/audio-bibles`, `/v1/audio-bibles/.../chapters/...`)
 */
export async function resolveApiBiblePassageAudioUrl(
  reference: string,
  translation: ApiBibleTranslation
): Promise<string | null> {
  const apiKey = process.env.API_BIBLE_KEY
  if (!apiKey) {
    return null
  }

  const envName = API_BIBLE_ID_ENV[translation]
  const textBibleId = process.env[envName]?.trim()
  if (!textBibleId) {
    return null
  }

  const parsed = parseReference(reference.trim())
  if (!parsed) {
    return null
  }

  const usfm = bookNameToUsfm(parsed.book)
  if (!usfm) {
    return null
  }

  const chapterId = `${usfm}.${parsed.chapter}`
  const base = (process.env.API_BIBLE_BASE_URL || 'https://rest.api.bible').replace(/\/$/, '')

  const [bibleRes, fromList] = await Promise.all([
    fetch(`${base}/v1/bibles/${encodeURIComponent(textBibleId)}`, {
      headers: { 'api-key': apiKey },
    }),
    fetchListAudioBibleIds(base, apiKey, textBibleId),
  ])

  let fromEmbed: string[] = []
  let textMeta: BibleMetaResponse['data'] | undefined
  if (bibleRes.ok) {
    const bj = (await bibleRes.json()) as BibleMetaResponse
    fromEmbed = embeddedAudioBibleIds(bj)
    textMeta = bj.data
  }

  let fromDiscover: string[] = []
  if (fromEmbed.length === 0 && fromList.length === 0 && textMeta) {
    fromDiscover = await discoverAudioBibleIdsFromTextMetadata(base, apiKey, textBibleId, textMeta)
  }

  const candidates = uniqueIds([...fromEmbed, ...fromList, ...fromDiscover])
  if (candidates.length === 0) {
    return null
  }

  const tried = new Set<string>()
  const out = await tryAudioBibleIds(base, apiKey, chapterId, usfm, parsed.chapter, candidates, tried)
  return out
}
