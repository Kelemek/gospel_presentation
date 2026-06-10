const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..', 'data', 'daily-verse-challenge')
const PROMPTS_PATH = path.join(ROOT, 'prompts.json')

function parseReference(reference) {
  const normalized = reference.replace(/–/g, '-')
  const match = normalized.match(/^(.+?)\s+(\d+)(?::\s*(\d+))?/)
  if (!match) return null
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verseStart: match[3] ? parseInt(match[3], 10) : null,
  }
}

describe('build-daily-verse-prompts', () => {
  it('committed prompts.json has mask metadata only (no display/clue strings)', () => {
    const file = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8'))
    expect(file.version).toBe(1)
    expect(file.translation).toBe('esv')
    expect(file.prompts.length).toBeGreaterThan(100)

    for (const row of file.prompts) {
      expect(row).toHaveProperty('id')
      expect(row).toHaveProperty('reference')
      expect(row).toHaveProperty('kind')
      expect(row).toHaveProperty('mask')
      expect(row).not.toHaveProperty('display')
      expect(row).not.toHaveProperty('clue')
      expect(row.kind).not.toBe('word_blank')
    }
  })

  it('skips chapter_blank when book+verse number collides', () => {
    const file = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8'))
    const chapterBlanks = file.prompts.filter((p) => p.kind === 'chapter_blank')
    const byKey = new Map()
    for (const row of chapterBlanks) {
      const parsed = parseReference(row.reference)
      const key = `${parsed.book.toLowerCase()}|${parsed.verseStart}`
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(row.reference)
    }
    for (const refs of byKey.values()) {
      expect(refs.length).toBe(1)
    }
  })

  it('build script emits reference-mask prompts only', () => {
    const tmpOut = path.join(ROOT, 'prompts.test-out.json')
    try {
      const out = execSync('node scripts/build-daily-verse-prompts.js', {
        cwd: path.join(__dirname, '..', '..'),
        env: {
          ...process.env,
          DAILY_VERSE_PROMPTS_OUT: tmpOut,
        },
        encoding: 'utf8',
      })
      expect(out).toMatch(/Wrote \d+ prompts/)
      const built = JSON.parse(fs.readFileSync(tmpOut, 'utf8'))
      expect(built.prompts.length).toBeGreaterThan(0)
      expect(built.prompts.some((p) => p.kind === 'word_blank')).toBe(false)
    } finally {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
    }
  })
})
