#!/usr/bin/env node
/**
 * Import OpenBible.info cross-reference data (CC BY) into gospel-admin/data/crossrefs/
 * Source: https://www.openbible.info/labs/cross-references/
 *
 * Usage (from gospel-admin/):
 *   node scripts/import-cross-references.js
 *   node scripts/import-cross-references.js --fixtures-only
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const zlib = require('zlib')
const readline = require('readline')

const ROOT = path.join(__dirname, '..', 'data', 'crossrefs')
const ZIP_URL = 'https://a.openbible.info/data/cross-references.zip'
const MIN_VOTES = 0

const OPENBIBLE_TO_USFM = {
  Gen: 'GEN', Exod: 'EXO', Lev: 'LEV', Num: 'NUM', Deut: 'DEU', Josh: 'JOS', Judg: 'JDG', Ruth: 'RUT',
  '1Sam': '1SA', '2Sam': '2SA', '1Kgs': '1KI', '2Kgs': '2KI', '1Chr': '1CH', '2Chr': '2CH',
  Ezra: 'EZR', Neh: 'NEH', Esth: 'EST', Job: 'JOB', Ps: 'PSA', Prov: 'PRO', Eccl: 'ECC', Song: 'SNG',
  Isa: 'ISA', Jer: 'JER', Lam: 'LAM', Ezek: 'EZK', Dan: 'DAN', Hos: 'HOS', Joel: 'JOL', Amos: 'AMO',
  Obad: 'OBA', Jonah: 'JON', Mic: 'MIC', Nah: 'NAM', Hab: 'HAB', Zeph: 'ZEP', Hag: 'HAG', Zech: 'ZEC', Mal: 'MAL',
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM', '1Cor': '1CO', '2Cor': '2CO',
  Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL', '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI', '2Tim': '2TI',
  Titus: 'TIT', Phlm: 'PHM', Heb: 'HEB', Jas: 'JAS', '1Pet': '1PE', '2Pet': '2PE', '1John': '1JN', '2John': '2JN',
  '3John': '3JN', Jude: 'JUD', Rev: 'REV',
}

const USFM_TO_BOOK = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy', JOS: 'Joshua', JDG: 'Judges',
  RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles',
  '2CH': '2 Chronicles', EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SNG: 'Song of Solomon', ISA: 'Isaiah', JER: 'Jeremiah', LAM: 'Lamentations', EZK: 'Ezekiel',
  DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel', AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah', NAM: 'Nahum',
  HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi', MAT: 'Matthew', MRK: 'Mark',
  LUK: 'Luke', JHN: 'John', ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', GAL: 'Galatians',
  EPH: 'Ephesians', PHP: 'Philippians', COL: 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy', TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews', JAS: 'James', '1PE': '1 Peter',
  '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John', JUD: 'Jude', REV: 'Revelation',
}

const fixturesOnly = process.argv.includes('--fixtures-only')
const FIXTURE_FROM_PREFIXES = ['Rom.8.', 'Gen.1.']

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

function extractZipTxt(zipBuffer) {
  const sig = zipBuffer.readUInt32LE(0)
  if (sig !== 0x04034b50) throw new Error('Not a ZIP file')
  let offset = 0
  while (offset < zipBuffer.length) {
    const headerSig = zipBuffer.readUInt32LE(offset)
    if (headerSig !== 0x04034b50) break
    const compMethod = zipBuffer.readUInt16LE(offset + 8)
    const compSize = zipBuffer.readUInt32LE(offset + 18)
    const fileNameLen = zipBuffer.readUInt16LE(offset + 26)
    const extraLen = zipBuffer.readUInt16LE(offset + 28)
    const name = zipBuffer.slice(offset + 30, offset + 30 + fileNameLen).toString('utf8')
    const dataStart = offset + 30 + fileNameLen + extraLen
    const data = zipBuffer.slice(dataStart, dataStart + compSize)
    offset = dataStart + compSize
    if (name.endsWith('cross_references.txt')) {
      if (compMethod === 0) return data.toString('utf8')
      if (compMethod === 8) return zlib.inflateRawSync(data).toString('utf8')
      throw new Error(`Unsupported ZIP compression method ${compMethod}`)
    }
  }
  throw new Error('cross_references.txt not found in ZIP')
}

function parseFromVerse(token) {
  const m = token.trim().match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)$/)
  if (!m) return null
  const usfm = OPENBIBLE_TO_USFM[m[1]]
  if (!usfm) return null
  const chapter = parseInt(m[2], 10)
  const verse = parseInt(m[3], 10)
  if (!Number.isFinite(chapter) || !Number.isFinite(verse)) return null
  return { usfm, chapter, verse }
}

function formatReference(usfm, chapter, verseStart, verseEnd) {
  const book = USFM_TO_BOOK[usfm]
  if (!book) return null
  if (verseEnd != null && verseEnd !== verseStart) {
    return `${book} ${chapter}:${verseStart}–${verseEnd}`
  }
  return `${book} ${chapter}:${verseStart}`
}

function parseTargetToken(token) {
  const trimmed = token.trim()
  const range = trimmed.match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)-\1\.(\d+)\.(\d+)$/)
  if (range) {
    const usfm = OPENBIBLE_TO_USFM[range[1]]
    if (!usfm) return null
    const chapter = parseInt(range[2], 10)
    const verseStart = parseInt(range[3], 10)
    const verseEnd = parseInt(range[5], 10)
    if (!Number.isFinite(chapter) || !Number.isFinite(verseStart) || !Number.isFinite(verseEnd)) return null
    const reference = formatReference(usfm, chapter, verseStart, verseEnd)
    if (!reference) return null
    return { passageKey: `${usfm}.${chapter}.${verseStart}`, reference }
  }
  const single = trimmed.match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)$/)
  if (!single) return null
  const usfm = OPENBIBLE_TO_USFM[single[1]]
  if (!usfm) return null
  const chapter = parseInt(single[2], 10)
  const verse = parseInt(single[3], 10)
  if (!Number.isFinite(chapter) || !Number.isFinite(verse)) return null
  const reference = formatReference(usfm, chapter, verse, verse)
  if (!reference) return null
  return { passageKey: `${usfm}.${chapter}.${verse}`, reference }
}

function shouldIncludeFrom(fromToken) {
  if (!fixturesOnly) return true
  return FIXTURE_FROM_PREFIXES.some((p) => fromToken.startsWith(p))
}

async function main() {
  console.log(fixturesOnly ? 'Importing cross-reference fixtures…' : 'Downloading OpenBible cross-reference data…')
  const zip = await download(ZIP_URL)
  const text = extractZipTxt(zip)

  /** @type {Map<string, Map<string, Map<string, { passageKey: string, reference: string, votes: number }[]>>>} */
  const shards = new Map()
  let lineNum = 0
  let imported = 0
  let skipped = 0

  for (const line of text.split('\n')) {
    lineNum++
    if (lineNum === 1 || !line.trim()) continue
    const cols = line.split('\t')
    if (cols.length < 3) continue
    const fromToken = cols[0].trim()
    const toToken = cols[1].trim()
    const votes = parseInt(cols[2], 10)
    if (!Number.isFinite(votes) || votes < MIN_VOTES) {
      skipped++
      continue
    }
    if (!shouldIncludeFrom(fromToken)) continue

    const from = parseFromVerse(fromToken)
    const target = parseTargetToken(toToken)
    if (!from || !target) {
      skipped++
      continue
    }

    const shardKey = `${from.usfm}/${from.chapter}`
    if (!shards.has(shardKey)) shards.set(shardKey, new Map())
    const chapterMap = shards.get(shardKey)
    const verseKey = String(from.verse)
    if (!chapterMap.has(verseKey)) chapterMap.set(verseKey, [])
    chapterMap.get(verseKey).push({ ...target, votes })
    imported++
  }

  if (fs.existsSync(ROOT)) {
    for (const entry of fs.readdirSync(ROOT)) {
      if (entry.startsWith('.')) continue
      fs.rmSync(path.join(ROOT, entry), { recursive: true, force: true })
    }
  }
  ensureDir(ROOT)

  for (const [shardKey, chapterMap] of shards) {
    const [usfm, chapter] = shardKey.split('/')
    const out = {}
    for (const [verse, rows] of chapterMap) {
      rows.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes
        return a.reference.localeCompare(b.reference)
      })
      out[verse] = rows
    }
    const dir = path.join(ROOT, usfm)
    ensureDir(dir)
    fs.writeFileSync(path.join(dir, `${chapter}.json`), JSON.stringify(out))
  }

  console.log(
    `Cross-reference import done: ${shards.size} chapter shard(s), ${imported} link(s), ${skipped} skipped row(s).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
