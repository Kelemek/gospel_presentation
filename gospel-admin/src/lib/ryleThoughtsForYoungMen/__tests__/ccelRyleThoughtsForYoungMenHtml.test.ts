import * as fs from 'fs'
import * as path from 'path'
import { parseCcelRyleThoughtsForYoungMenXml } from '@/lib/ryleThoughtsForYoungMen/ccelRyleThoughtsForYoungMenHtml'
import { RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG } from '@/lib/ryleThoughtsForYoungMen/ryleThoughtsForYoungMenSlug'

const FIXTURE = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'ryle-thoughts-young-men-snippet.xml'),
  'utf8'
)

describe('parseCcelRyleThoughtsForYoungMenXml', () => {
  it('parses Chapter XIX into six subsections with passage keys', () => {
    const parsed = parseCcelRyleThoughtsForYoungMenXml(FIXTURE)
    expect(parsed.slug).toBe(RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG)
    expect(parsed.gospelSection.section).toBe(RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(6)
    expect(parsed.gospelSection.subsections.map((s) => s.title)).toEqual([
      'Introduction',
      'Reasons for Exhorting Young Men',
      'Dangers to Young Men',
      'General Counsels to Young Men',
      'Special Rules for Young Men',
      'Conclusion',
    ])
    expect(parsed.gospelSection.subsections[0].content).toContain('Titus 2:6')
    expect(parsed.gospelSection.subsections[1].content).toContain('Matthew 7:14')
    expect(parsed.passageKeys.length).toBeGreaterThan(0)
  })

  it('throws when Chapter XIX is missing', () => {
    expect(() =>
      parseCcelRyleThoughtsForYoungMenXml('<div1 title="Chapter I" id="iii"><p>Other</p></div1>')
    ).toThrow(/Chapter XIX/)
  })
})
