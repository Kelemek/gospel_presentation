/**
 * Fetch Grace Gems *Lectures to My Students* HTML and emit
 * `data/lectures-to-my-students/chapters.json` for `npm run import-lectures-to-my-students`.
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/extract-lectures-to-my-students-gracegems.ts
 *   npx tsx scripts/extract-lectures-to-my-students-gracegems.ts --html /path/to/lectures_to_my_student.htm
 */
import * as fs from 'fs'
import * as path from 'path'
import {
  decodeGraceGemsLecturesHtmlBytes,
  GRACE_GEMS_LTMS_HTML_URL,
  parseGraceGemsLecturesHtml,
} from '../src/lib/lecturesToMyStudents/graceGemsLecturesHtml'

const OUT_PATH = path.join(__dirname, '../data/lectures-to-my-students/chapters.json')

function parseArgs(argv: string[]): { htmlPath: string | null } {
  let htmlPath: string | null = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--html' && argv[i + 1]) {
      htmlPath = argv[i + 1]
      i++
    }
  }
  return { htmlPath }
}

async function loadHtml(htmlPath: string | null): Promise<string> {
  if (htmlPath) {
    const buf = fs.readFileSync(path.resolve(htmlPath))
    return decodeGraceGemsLecturesHtmlBytes(buf)
  }
  console.log(`Fetching ${GRACE_GEMS_LTMS_HTML_URL}…`)
  const res = await fetch(GRACE_GEMS_LTMS_HTML_URL)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  return decodeGraceGemsLecturesHtmlBytes(buf)
}

async function main() {
  const { htmlPath } = parseArgs(process.argv.slice(2))
  const html = await loadHtml(htmlPath)
  const data = parseGraceGemsLecturesHtml(html)

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  console.log(
    `Wrote ${OUT_PATH}: intro ${data.introduction.length} paragraph(s), ${data.chapters.length} chapter(s).`
  )
  for (const ch of data.chapters) {
    console.log(`  Chapter ${ch.number}: ${ch.title} (${ch.paragraphs.length} paragraphs)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
