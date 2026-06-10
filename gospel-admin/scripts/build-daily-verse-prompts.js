#!/usr/bin/env node
/**
 * Build mask-only daily verse challenge prompts from verses.json.
 * Reference masks only — verse text is fetched at runtime in the browser.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'data', 'daily-verse-challenge')
const VERSES_PATH = path.join(ROOT, 'verses.json')
const OUT_PATH =
  process.env.DAILY_VERSE_PROMPTS_OUT || path.join(ROOT, 'prompts.json')

function parseReference(reference) {
  const normalized = reference.replace(/–/g, '-').replace(/(\d+)[a-z]+/gi, '$1')
  const match = normalized.match(/^(.+?)\s+(\d+)(?::\s*(\d+)(?:\s*-\s*(\d+))?)?$/)
  if (!match) return null
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verseStart: match[3] ? parseInt(match[3], 10) : null,
  }
}

function referenceToSlug(reference) {
  return reference.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function chapterBlankCollides(verses) {
  const byBookVerse = new Map()
  for (const row of verses) {
    const parsed = parseReference(row.reference)
    if (!parsed || parsed.verseStart == null) continue
    const key = `${parsed.book.toLowerCase()}|${parsed.verseStart}`
    if (!byBookVerse.has(key)) byBookVerse.set(key, [])
    byBookVerse.get(key).push(row.reference)
  }
  const colliding = new Set()
  for (const [, refs] of byBookVerse) {
    if (refs.length > 1) {
      for (const ref of refs) colliding.add(ref)
    }
  }
  return colliding
}

function main() {
  const versesFile = JSON.parse(fs.readFileSync(VERSES_PATH, 'utf8'))
  const verses = versesFile.verses ?? []
  const chapterCollisions = chapterBlankCollides(verses)
  const prompts = []

  for (const row of verses) {
    const { reference, bookBlank } = row
    const slug = referenceToSlug(reference)
    const parsed = parseReference(reference)
    if (!parsed || parsed.verseStart == null) {
      console.warn(`Skipping (needs verse): ${reference}`)
      continue
    }

    prompts.push({
      id: `${slug}-verse-blank`,
      reference,
      kind: 'verse_blank',
      mask: { reference: { hide: ['verse'] } },
    })

    if (!chapterCollisions.has(reference)) {
      prompts.push({
        id: `${slug}-chapter-blank`,
        reference,
        kind: 'chapter_blank',
        mask: { reference: { hide: ['chapter'] } },
      })
    }

    if (bookBlank) {
      prompts.push({
        id: `${slug}-book-blank`,
        reference,
        kind: 'book_blank',
        mask: { reference: { hide: ['book'] } },
      })
    }
  }

  const out = {
    version: 1,
    translation: 'esv',
    generatedAt: new Date().toISOString().slice(0, 10),
    prompts,
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`Wrote ${prompts.length} prompts to ${OUT_PATH}`)
}

main()
