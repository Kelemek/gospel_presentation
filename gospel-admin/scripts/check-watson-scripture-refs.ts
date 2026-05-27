/**
 * Scan all CCEL Watson books for scripture refs that fail normalization after unwrap.
 * Usage: npx tsx scripts/check-watson-scripture-refs.ts
 */
import { parseCcelWatsonXml } from '@/lib/watson/ccelWatsonHtml'
import { WATSON_CCEL_BOOKS } from '@/lib/watson/watsonCcelManifest'
import { unwrapScripRefTags } from '@/lib/spurgeon/ccelSermonHtml'
import { isGospelCanonicalScriptureRef } from '@/lib/scriptureReferenceNormalize'

const PERIOD_ABBREV_RE =
  /\b(?:Ep|He|Go|Mat|Lu|Ro|Ez|Can|Pe|Ph|Ti|Is|Es|Nu)\.\s+\d+\.\s*\d+/g

async function checkBook(book: (typeof WATSON_CCEL_BOOKS)[number]) {
  const xml = await fetch(book.xmlUrl).then((r) => r.text())
  const scripRe = /<scripRef\b([^>]*)>([\s\S]*?)<\/scripRef>/gi
  const noOsisFailed: { passage: string; out: string }[] = []
  const osisFailed: { passage: string; osis: string; out: string }[] = []
  let m: RegExpExecArray | null
  while ((m = scripRe.exec(xml)) !== null) {
    const attrs = m[1]
    const inner = m[2].replace(/<[^>]+>/g, '').trim()
    const passage = /\bpassage="([^"]+)"/i.exec(attrs)?.[1] ?? inner
    const osis = /\bosisRef="([^"]+)"/i.exec(attrs)?.[1]
    const tag = `<scripRef${attrs}>${m[2]}</scripRef>`
    const out = unwrapScripRefTags(tag)
    if (!isGospelCanonicalScriptureRef(out)) {
      if (osis) osisFailed.push({ passage, osis, out })
      else noOsisFailed.push({ passage, out })
    }
  }

  const data = parseCcelWatsonXml(xml, book)
  const periodInHtml: string[] = []
  const collect = (html: string | undefined) => {
    if (!html?.trim()) return
    const text = html.replace(/<[^>]+>/g, ' ')
    for (const x of text.match(PERIOD_ABBREV_RE) ?? []) periodInHtml.push(x)
  }
  for (const sub of data.gospelSection.subsections ?? []) {
    collect(sub.content)
    for (const n of sub.nestedSubsections ?? []) collect(n.content)
  }

  return {
    slug: book.slug,
    id: book.id,
    passageKeys: data.passageKeys.length,
    noOsisFailed: dedupe(noOsisFailed, (x) => `${x.passage}|${x.out}`),
    osisFailed: dedupe(osisFailed, (x) => `${x.passage}|${x.out}`),
    periodInHtml: [...new Set(periodInHtml)],
  }
}

function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  return [...new Map(items.map((x) => [key(x), x])).values()]
}

async function main() {
  for (const book of WATSON_CCEL_BOOKS) {
    process.stderr.write(`Checking ${book.slug}…\n`)
    const r = await checkBook(book)
    console.log(`\n=== ${r.slug} (${r.id}) ===`)
    console.log(`passage keys: ${r.passageKeys}`)
    if (r.noOsisFailed.length) {
      console.log(`no-osisRef unwrap failures (${r.noOsisFailed.length}):`)
      r.noOsisFailed.forEach((x) => console.log(`  ${JSON.stringify(x)}`))
    }
    if (r.osisFailed.length) {
      console.log(`osisRef unwrap failures (${r.osisFailed.length}):`)
      r.osisFailed.forEach((x) => console.log(`  ${JSON.stringify(x)}`))
    }
    if (r.periodInHtml.length) {
      console.log(`period abbrevs still in parsed HTML: ${r.periodInHtml.join(', ')}`)
    }
    if (
      !r.noOsisFailed.length &&
      !r.osisFailed.length &&
      !r.periodInHtml.length
    ) {
      console.log('OK — no missed refs in parse pipeline')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
