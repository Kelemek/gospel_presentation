#!/usr/bin/env node
/**
 * Import STEPBible-Data (CC BY 4.0) into gospel-admin/data/stepbible/
 * Pin: https://github.com/STEPBible/STEPBible-Data @ master
 *
 * Usage (from gospel-admin/):
 *   node scripts/import-stepbible-data.js
 *   node scripts/import-stepbible-data.js --fixtures-only
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const https = require('https')

const ROOT = path.join(__dirname, '..', 'data', 'stepbible')
const BASE =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master'

const WORD_FILES = [
  `${BASE}/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt`,
  `${BASE}/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt`,
  `${BASE}/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
  `${BASE}/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Jos-Est%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
  `${BASE}/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
  `${BASE}/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Isa-Mal%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
]

const LEXICON_FILES = {
  greekBrief: `${BASE}/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt`,
  hebrewBrief: `${BASE}/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt`,
  greekFull: `${BASE}/Lexicons/TFLSJ%20%200-5624%20-%20Translators%20Formatted%20full%20LSJ%20Bible%20lexicon%20-%20STEPBible.org%20CC%20BY.txt`,
}

const STEP_TO_USFM = {
  Gen: 'GEN', Exo: 'EXO', Lev: 'LEV', Num: 'NUM', Deu: 'DEU', Jos: 'JOS', Jdg: 'JDG', Rut: 'RUT',
  '1Sa': '1SA', '2Sa': '2SA', '1Ki': '1KI', '2Ki': '2KI', '1Ch': '1CH', '2Ch': '2CH',
  Ezr: 'EZR', Neh: 'NEH', Est: 'EST', Job: 'JOB', Psa: 'PSA', Pro: 'PRO', Ecc: 'ECC', Sng: 'SNG',
  Isa: 'ISA', Jer: 'JER', Lam: 'LAM', Ezk: 'EZK', Dan: 'DAN', Hos: 'HOS', Jol: 'JOL', Amo: 'AMO',
  Oba: 'OBA', Jon: 'JON', Mic: 'MIC', Nam: 'NAM', Hab: 'HAB', Zep: 'ZEP', Hag: 'HAG', Zec: 'ZEC', Mal: 'MAL',
  Mat: 'MAT', Mrk: 'MRK', Luk: 'LUK', Jhn: 'JHN', Act: 'ACT', Rom: 'ROM', '1Co': '1CO', '2Co': '2CO',
  Gal: 'GAL', Eph: 'EPH', Php: 'PHP', Col: 'COL', '1Th': '1TH', '2Th': '2TH', '1Ti': '1TI', '2Ti': '2TI',
  Tit: 'TIT', Phm: 'PHM', Heb: 'HEB', Jas: 'JAS', '1Pe': '1PE', '2Pe': '2PE', '1Jn': '1JN', '2Jn': '2JN',
  '3Jn': '3JN', Jud: 'JUD', Rev: 'REV',
}

const NT_USFM = new Set([
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
  '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
])

/** Optional [ch.v] = modern English verse (e.g. 2Co.13.13[13.14] → store under v14). */
const WORD_LINE_RE = /^([1-3]?[A-Za-z]{2,4})\.(\d+)\.(\d+)(?:\[(\d+)\.(\d+)\])?#\d+=/

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function parseSurface(cell) {
  const t = cell.trim()
  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (m) return { text: m[1].trim(), transliteration: m[2].trim() }
  return { text: t }
}

/** TAHOT col2 uses quoted STEPBible transliteration, e.g. 'a.Tah */
function cleanHebrewTransliteration(cell) {
  const t = (cell || '').trim()
  if (!t) return undefined
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t.slice(1, -1).trim() || undefined
  }
  return t
}

function normalizeGreek(code) {
  const m = code.match(/^G(\d+)/i)
  return m ? `G${parseInt(m[1], 10)}` : code
}

function normalizeHebrew(code) {
  const m = code.match(/^H(\d+)/i)
  return m ? `H${parseInt(m[1], 10)}` : code.toUpperCase()
}

function parseStrongsMorph(cell) {
  const raw = cell.trim()
  const g = raw.match(/(G\d{1,5}[A-Z]?)/i)
  if (g) {
    const morph = raw.includes('=') ? raw.split('=').slice(1).join('=') : undefined
    return { strongs: normalizeGreek(g[1]), morph }
  }
  const hAll = [...raw.matchAll(/H(\d{1,5}[A-Z]?)/gi)]
  if (hAll.length) {
    const last = `H${hAll[hAll.length - 1][1]}`
    return { strongs: normalizeHebrew(last) }
  }
  return { strongs: raw }
}

function parseGloss(cell) {
  const i = cell.indexOf('=')
  if (i === -1) return { gloss: cell.trim() || undefined }
  return { lemma: cell.slice(0, i).trim(), gloss: cell.slice(i + 1).trim() }
}

function parseWordLine(line) {
  if (!WORD_LINE_RE.test(line)) return null
  const cols = line.split('\t')
  if (cols.length < 4) return null
  const refM = cols[0].trim().match(WORD_LINE_RE)
  if (!refM) return null
  const stepBook = refM[1]
  let chapter = parseInt(refM[2], 10)
  let verse = parseInt(refM[3], 10)
  if (refM[4] !== undefined && refM[5] !== undefined) {
    chapter = parseInt(refM[4], 10)
    verse = parseInt(refM[5], 10)
  }
  const usfm = STEP_TO_USFM[stepBook]
  if (!usfm) return null
  const posM = cols[0].match(/#(\d+)=/)
  const position = posM ? parseInt(posM[1], 10) : 0
  const surface = parseSurface(cols[1] || '')
  const language = NT_USFM.has(usfm) ? 'grc' : 'heb'
  // TAGNT: col1 surface (opt. parens translit), col2 English, col3 dStrongs, col4 dictionary.
  // TAHOT: col1 surface, col2 transliteration, col3 English, col4 dStrongs, col5 morphology, col6+ dictionary.
  let transliteration = surface.transliteration
  let english
  let dStrongsCell
  let dictCell
  let hebrewMorph
  if (language === 'heb') {
    transliteration = cleanHebrewTransliteration(cols[2]) || transliteration
    english = (cols[3] || '').trim()
    dStrongsCell = (cols[4] || '').trim()
    hebrewMorph = (cols[5] || '').trim() || undefined
    dictCell = cols.slice(6).find((c) => c.includes('=')) || ''
  } else {
    english = (cols[2] || '').trim()
    dStrongsCell = (cols[3] || '').trim()
    dictCell = cols[4] || ''
  }
  const { strongs, morph } = parseStrongsMorph(dStrongsCell)
  const dict = parseGloss(dictCell)
  return {
    usfm,
    chapter,
    verse,
    language,
    word: {
      position,
      text: surface.text,
      transliteration,
      strongs: dStrongsCell || strongs,
      morph: hebrewMorph || morph,
      gloss: english || dict.gloss || undefined,
    },
  }
}

/** In-memory chapters: key `${usfm}.${chapter}` → { verse: { language, words } } */
const chapters = new Map()

function addWord(parsed) {
  const key = `${parsed.usfm}.${parsed.chapter}`
  if (!chapters.has(key)) chapters.set(key, {})
  const ch = chapters.get(key)
  const vk = String(parsed.verse)
  if (!ch[vk]) ch[vk] = { language: parsed.language, words: [] }
  ch[vk].words.push(parsed.word)
}

function writeChapterFiles() {
  const wordsRoot = path.join(ROOT, 'words')
  ensureDir(wordsRoot)
  for (const [key, verses] of chapters) {
    const [usfm, ch] = key.split('.')
    const dir = path.join(wordsRoot, usfm)
    ensureDir(dir)
    const out = path.join(dir, `${ch}.json`)
    fs.writeFileSync(out, JSON.stringify(verses))
  }
}

function cachePathForUrl(url) {
  const hash = crypto.createHash('sha256').update(url).digest('hex')
  return path.join(ROOT, '.cache', `${hash}.txt`)
}

function downloadToTemp(url) {
  return new Promise((resolve, reject) => {
    const tmp = cachePathForUrl(url)
    ensureDir(path.dirname(tmp))
    if (fs.existsSync(tmp) && fs.statSync(tmp).size > 50_000) {
      resolve(tmp)
      return
    }
    const file = fs.createWriteStream(tmp)
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close()
          fs.unlinkSync(tmp)
          downloadToTemp(res.headers.location).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve(tmp)))
      })
      .on('error', reject)
  })
}

async function processWordFile(url) {
  console.log('Words:', url.split('/').pop())
  const tmp = await downloadToTemp(url)
  const rl = readline.createInterface({ input: fs.createReadStream(tmp, 'utf8'), crlfDelay: Infinity })
  let count = 0
  for await (const line of rl) {
    const p = parseWordLine(line)
    if (p) {
      addWord(p)
      count++
    }
  }
  console.log('  parsed words:', count)
}

function parseLexiconLine(line, prefix) {
  if (!line.startsWith(prefix)) return null
  const cols = line.split('\t')
  if (cols.length < 8) return null
  const key = normalizeGreek(cols[0].trim())
  return {
    key,
    lemma: cols[3]?.trim(),
    transliteration: cols[4]?.trim(),
    gloss: cols[6]?.trim(),
    definition: cols[7]?.trim() || cols[6]?.trim(),
  }
}

function parseHebrewLexiconLine(line) {
  if (!line.startsWith('H')) return null
  const cols = line.split('\t')
  if (cols.length < 8) return null
  const key = normalizeHebrew(cols[0].trim())
  return {
    key,
    lemma: cols[3]?.trim(),
    transliteration: cols[4]?.trim(),
    gloss: cols[6]?.trim(),
    definition: cols[7]?.trim() || cols[6]?.trim(),
  }
}

async function importLexicons() {
  console.log('Lexicons…')
  const lexDir = path.join(ROOT, 'lexicon')
  ensureDir(lexDir)

  const greek = { brief: {}, full: {} }
  const hebrew = { brief: {} }

  const tbPath = await downloadToTemp(LEXICON_FILES.greekBrief)
  for await (const line of readline.createInterface({
    input: fs.createReadStream(tbPath, 'utf8'),
    crlfDelay: Infinity,
  })) {
    const e = parseLexiconLine(line, 'G')
    if (e) {
      greek.brief[e.key] = {
        lemma: e.lemma,
        transliteration: e.transliteration,
        gloss: e.gloss,
        definition: e.definition,
      }
    }
  }

  const tflPath = await downloadToTemp(LEXICON_FILES.greekFull)
  for await (const line of readline.createInterface({
    input: fs.createReadStream(tflPath, 'utf8'),
    crlfDelay: Infinity,
  })) {
    const e = parseLexiconLine(line, 'G')
    if (e?.definition) {
      greek.full[e.key] = { definition: e.definition }
    }
  }

  const tbhPath = await downloadToTemp(LEXICON_FILES.hebrewBrief)
  for await (const line of readline.createInterface({
    input: fs.createReadStream(tbhPath, 'utf8'),
    crlfDelay: Infinity,
  })) {
    const e = parseHebrewLexiconLine(line)
    if (e) {
      hebrew.brief[e.key] = {
        lemma: e.lemma,
        transliteration: e.transliteration,
        gloss: e.gloss,
        definition: e.definition,
      }
    }
  }

  fs.writeFileSync(path.join(lexDir, 'greek.json'), JSON.stringify(greek))
  fs.writeFileSync(path.join(lexDir, 'hebrew.json'), JSON.stringify(hebrew))
  console.log('  Greek brief:', Object.keys(greek.brief).length, 'full:', Object.keys(greek.full).length)
  console.log('  Hebrew brief:', Object.keys(hebrew.brief).length)
}

function writeFixturesOnly() {
  ensureDir(path.join(ROOT, 'words', 'ROM'))
  ensureDir(path.join(ROOT, 'words', 'GEN'))
  ensureDir(path.join(ROOT, 'words', 'JHN'))
  ensureDir(path.join(ROOT, 'lexicon'))

  fs.writeFileSync(
    path.join(ROOT, 'words', 'ROM', '12.json'),
    JSON.stringify({
      '2': {
        language: 'grc',
        words: [
          { position: 8, text: 'μεταμορφοῦσθε', transliteration: 'metamorphousthe', strongs: 'G3339', morph: 'V-PPM-2P', gloss: 'do be transformed' },
        ],
      },
      '3': {
        language: 'grc',
        words: [
          { position: 1, text: 'λέγω', transliteration: 'legō', strongs: 'G3004', gloss: 'I say' },
        ],
      },
    })
  )
  fs.writeFileSync(
    path.join(ROOT, 'words', 'GEN', '1.json'),
    JSON.stringify({
      '1': {
        language: 'heb',
        words: [
          { position: 3, text: 'אֱלֹהִ֑ים', transliteration: "'E.lo.Him", strongs: 'H430', gloss: 'God' },
        ],
      },
    })
  )
  fs.writeFileSync(
    path.join(ROOT, 'words', 'JHN', '3.json'),
    JSON.stringify({
      '16': {
        language: 'grc',
        words: [
          { position: 1, text: 'Οὕτως', transliteration: 'Houtōs', strongs: 'G3779', gloss: 'Thus' },
        ],
      },
    })
  )
  fs.writeFileSync(
    path.join(ROOT, 'lexicon', 'greek.json'),
    JSON.stringify({
      brief: {
        G3339: { lemma: 'μεταμορφόω', transliteration: 'metamorphoō', gloss: 'to transform', definition: 'to transform, transfigure' },
        G3779: { lemma: 'οὕτω', transliteration: 'houtō', gloss: 'thus', definition: 'thus, so, in this manner' },
        G3004: { lemma: 'λέγω', transliteration: 'legō', gloss: 'I say', definition: 'to speak, say' },
      },
      full: {
        G3339: { definition: 'Full LSJ: transform, transfigure (fixture)' },
      },
    })
  )
  fs.writeFileSync(
    path.join(ROOT, 'lexicon', 'hebrew.json'),
    JSON.stringify({
      brief: {
        H430: { lemma: 'אֱלֹהִים', transliteration: 'elohim', gloss: 'God', definition: 'God, gods' },
        H859: { lemma: 'אַתָּה', transliteration: 'a.yin', gloss: 'you', definition: 'you' },
      },
    })
  )
  console.log('Wrote fixture data under data/stepbible/')
}

async function main() {
  const fixturesOnly = process.argv.includes('--fixtures-only')
  ensureDir(ROOT)

  if (fixturesOnly) {
    writeFixturesOnly()
    return
  }

  for (const url of WORD_FILES) {
    await processWordFile(url)
  }
  writeChapterFiles()
  await importLexicons()
  console.log('Done. Chapters:', chapters.size)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
