import { readFileSync } from 'fs'
import path from 'path'
import { parseCcelPilgrimXml } from '@/lib/pilgrim/ccelPilgrimHtml'
import { PILGRIM_PROGRESS_SLUG } from '@/lib/pilgrim/pilgrimSlug'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'pilgrim-part1-stage1-snippet.xml'),
  'utf8'
)

describe('parseCcelPilgrimXml', () => {
  it('parses apology and Part I stage from fixture', () => {
    const parsed = parseCcelPilgrimXml(FIXTURE)
    expect(parsed.slug).toBe(PILGRIM_PROGRESS_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(2)
    expect(parsed.gospelSection.subsections[0].title).toMatch(/APOLOGY/i)
    expect(parsed.gospelSection.subsections[1].title).toBe('PART I — THE FIRST STAGE')
    expect(parsed.gospelSection.subsections[1].content).toContain('Isaiah 64:6')
    expect(parsed.passageKeys.some((k) => k.startsWith('ISA.64'))).toBe(true)
  })
})
