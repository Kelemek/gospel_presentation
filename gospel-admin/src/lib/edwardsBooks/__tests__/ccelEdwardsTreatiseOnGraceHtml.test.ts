import { readFileSync } from 'fs'
import path from 'path'
import { parseCcelEdwardsTreatiseOnGraceXml } from '@/lib/edwardsBooks/ccelEdwardsTreatiseOnGraceHtml'
import { EDWARDS_TREATISE_ON_GRACE_SLUG } from '@/lib/edwardsBooks/edwardsBookSlugs'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'treatise-on-grace-snippet.xml'),
  'utf8'
)

describe('parseCcelEdwardsTreatiseOnGraceXml', () => {
  it('parses chapters and skips title page and index div2', () => {
    const parsed = parseCcelEdwardsTreatiseOnGraceXml(FIXTURE)
    expect(parsed.slug).toBe(EDWARDS_TREATISE_ON_GRACE_SLUG)
    expect(parsed.gospelData).toHaveLength(1)
    expect(parsed.gospelData[0].subsections).toHaveLength(1)
    expect(parsed.gospelData[0].subsections[0].title).toBe('CHAPTER I.')
    expect(parsed.gospelData[0].subsections[0].content).toContain('Romans 3:24')
    expect(parsed.passageKeys.some((k) => k.startsWith('ROM.3'))).toBe(true)
  })
})
