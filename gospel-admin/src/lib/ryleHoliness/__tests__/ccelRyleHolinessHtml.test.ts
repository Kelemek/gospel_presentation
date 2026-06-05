import { readFileSync } from 'fs'
import path from 'path'
import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { parseCcelRyleHolinessXml } from '@/lib/ryleHoliness/ccelRyleHolinessHtml'
import { RYLE_HOLINESS_SLUG } from '@/lib/ryleHoliness/ryleHolinessSlug'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'ryle-holiness-snippet.xml'),
  'utf8'
)

describe('parseCcelRyleHolinessXml', () => {
  it('parses Introduction and div2 chapter; skips Contents and Indexes', () => {
    const parsed = parseCcelRyleHolinessXml(FIXTURE)
    expect(parsed.slug).toBe(RYLE_HOLINESS_SLUG)
    expect(parsed.gospelSection.section).toBe(RYLE_HOLINESS_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(2)
    expect(parsed.gospelSection.subsections[0].title).toBe('Introduction')
    expect(parsed.gospelSection.subsections[1].title).toBe('I. Sin')
    expect(parsed.gospelSection.subsections[0].content).toContain('John 3:3')
    expect(parsed.gospelSection.subsections[1].content).toContain('Romans 3:23')
    expect(parsed.gospelSection.subsections[0].content).not.toContain('Footnote')
    expect(parsed.gospelSection.subsections[1].content).toContain('<strong>Short section head</strong>')
    expect(parsed.passageKeys.some((k) => k.startsWith('JHN.3'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('ROM.3'))).toBe(true)
  })

  it('throws when no div2 blocks are present', () => {
    expect(() =>
      parseCcelRyleHolinessXml('<div1 title="Title Page"><p>Only title</p></div1>')
    ).toThrow(/No Ryle Holiness div2/)
  })

  it('finalizeGospelDataForImport normalizes scripture in stored HTML', () => {
    const parsed = parseCcelRyleHolinessXml(FIXTURE)
    const { gospelData } = finalizeGospelDataForImport([parsed.gospelSection], {
      additionalPassageKeys: parsed.passageKeys,
    })
    const introHtml = gospelData[0].subsections[0].content
    expect(introHtml).toContain('John 3:3')
    expect(introHtml).not.toMatch(/\bJohn\.\s*3\.3/)
  })
})
