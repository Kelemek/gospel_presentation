import { readFileSync } from 'fs'
import path from 'path'
import { parseCcelEdwardsReligiousAffectionsXml } from '@/lib/edwardsBooks/ccelEdwardsReligiousAffectionsHtml'
import { EDWARDS_RELIGIOUS_AFFECTIONS_SLUG } from '@/lib/edwardsBooks/edwardsBookSlugs'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'religious-affections-snippet.xml'),
  'utf8'
)

describe('parseCcelEdwardsReligiousAffectionsXml', () => {
  it('parses three Parts with Introduction and Part III section I folding', () => {
    const parsed = parseCcelEdwardsReligiousAffectionsXml(FIXTURE)
    expect(parsed.slug).toBe(EDWARDS_RELIGIOUS_AFFECTIONS_SLUG)
    expect(parsed.gospelData).toHaveLength(3)

    const partI = parsed.gospelData.find((s) => s.section === '1')
    expect(partI?.subsections[0].title).toBe('Introduction')
    expect(partI?.subsections[0].content).toContain('1 Peter 1:8')
    expect(partI?.subsections.some((s) => s.title.startsWith('Part I.'))).toBe(true)

    const partII = parsed.gospelData.find((s) => s.section === '2')
    expect(partII?.subsections).toHaveLength(1)

    const partIII = parsed.gospelData.find((s) => s.section === '3')
    expect(partIII?.subsections.length).toBeGreaterThanOrEqual(2)
    expect(partIII?.subsections[0].title).toMatch(/^I\.\s+Affections/)
    expect(partIII?.subsections[1].title).toMatch(/^II\./)
    expect(partIII?.subsections[1].content).toContain('Matthew 5:8')
    expect(parsed.passageKeys.some((k) => k.startsWith('MAT.5'))).toBe(true)
  })
})
