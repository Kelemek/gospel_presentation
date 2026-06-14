/**
 * One-time / maintainer tool: download Chapel Library PDF (code aogo) and emit
 * `data/pink-attributes/chapters.json` for `npm run import-pink-attributes`.
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/extract-pink-attributes-chapel-pdf.ts
 *   npx tsx scripts/extract-pink-attributes-chapel-pdf.ts --pdf /path/to/aogo.pdf
 */
import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { paragraphsFromPdfLines } from '../src/lib/pinkAttributes/pinkAttributesPdfText'

const CHAPEL_PDF_URL = 'https://www.chapellibrary.org/api/books/download?code=aogo&format=pdf'
const OUT_PATH = path.join(__dirname, '../data/pink-attributes/chapters.json')

const CHAPTER_TITLES: readonly { number: number; title: string }[] = [
  { number: 1, title: 'The Solitariness of God' },
  { number: 2, title: 'The Decrees of God' },
  { number: 3, title: 'The Knowledge of God' },
  { number: 4, title: 'The Foreknowledge of God' },
  { number: 5, title: 'The Supremacy of God' },
  { number: 6, title: 'The Sovereignty of God' },
  { number: 7, title: 'The Immutability of God' },
  { number: 8, title: 'The Holiness of God' },
  { number: 9, title: 'The Power of God' },
  { number: 10, title: 'The Faithfulness of God' },
  { number: 11, title: 'The Goodness of God' },
  { number: 12, title: 'The Patience of God' },
  { number: 13, title: 'The Grace of God' },
  { number: 14, title: 'The Mercy of God' },
  { number: 15, title: 'The Lovingkindness of God' },
  { number: 16, title: 'The Love of God' },
  { number: 17, title: 'The Love of God to Us' },
  { number: 18, title: 'The Wrath of God' },
  { number: 19, title: 'The Contemplation of God' },
]

function parseArgs(argv: string[]): { pdfPath: string | null } {
  let pdfPath: string | null = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pdf' && argv[i + 1]) {
      pdfPath = argv[i + 1]
      i++
    }
  }
  return { pdfPath }
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function findBodyStart(text: string): number {
  const m = /\nPreface\n[“"]ACQUAINT NOW THYSELF/i.exec(text)
  if (!m || m.index === undefined) {
    throw new Error('Could not locate Preface body in PDF text')
  }
  return m.index + 1
}

function findIndexEnd(text: string, from: number): number {
  const idx = text.indexOf('\nIndex of Authors Quoted', from)
  return idx >= 0 ? idx : text.length
}

function splitByChapterMarkers(text: string): Map<number, string> {
  const re = /\nChapter (\d+)\s*\n/g
  const matches: { number: number; start: number; headerEnd: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const number = Number(m[1])
    const titleLineEnd = text.indexOf('\n', m.index + m[0].length)
    const headerEnd = titleLineEnd >= 0 ? titleLineEnd + 1 : m.index + m[0].length
    matches.push({ number, start: m.index, headerEnd })
  }

  const byNumber = new Map<number, string>()
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]
    const next = matches[i + 1]
    const chunk = text.slice(cur.headerEnd, next?.start ?? text.length).trim()
    if (!byNumber.has(cur.number)) {
      byNumber.set(cur.number, chunk)
    }
  }
  return byNumber
}

async function loadPdfBuffer(pdfPath: string | null): Promise<Buffer> {
  if (pdfPath) {
    return fs.readFileSync(path.resolve(pdfPath))
  }
  console.log(`Fetching ${CHAPEL_PDF_URL}…`)
  const res = await fetch(CHAPEL_PDF_URL)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  const { pdfPath } = parseArgs(process.argv.slice(2))
  const buffer = await loadPdfBuffer(pdfPath)
  const parsed = await pdfParse(buffer)
  const raw = normalizeWhitespace(parsed.text)
  const bodyStart = findBodyStart(raw)
  const bodyEnd = findIndexEnd(raw, bodyStart)
  const body = raw.slice(bodyStart, bodyEnd)

  const ch1Marker = body.search(/\nChapter 1\s*\n/)
  if (ch1Marker < 0) {
    throw new Error('Could not locate Chapter 1 in body')
  }

  const prefaceLines = body.slice('Preface'.length, ch1Marker).split('\n')
  const prefaceParagraphs = paragraphsFromPdfLines(prefaceLines).filter(
    (p) => !/^- A\.W\. Pink/i.test(p)
  )

  const chapterChunks = splitByChapterMarkers(body)
  const chapters = CHAPTER_TITLES.map(({ number, title }) => {
    const chunk = chapterChunks.get(number) ?? ''
    const lines = chunk.split('\n')
    const withoutTitle =
      lines[0]?.trim().toLowerCase() === title.toLowerCase() ? lines.slice(1) : lines
    const paragraphs = paragraphsFromPdfLines(withoutTitle)
    return { number, title, paragraphs }
  })

  const out = {
    source: 'Chapel Library edition 1993 (code aogo)',
    sourceUrl: CHAPEL_PDF_URL,
    title: 'The Attributes of God (A.W. Pink)',
    preface: prefaceParagraphs,
    chapters,
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${OUT_PATH}`)
  console.log(`  preface paragraphs: ${prefaceParagraphs.length}`)
  for (const ch of chapters) {
    console.log(`  ch ${ch.number}: ${ch.paragraphs.length} paragraph(s) — ${ch.title}`)
  }

  const empty = chapters.filter((c) => c.paragraphs.length === 0)
  if (empty.length > 0 || prefaceParagraphs.length === 0) {
    throw new Error(`Extraction incomplete: ${empty.map((c) => c.number).join(', ')}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
