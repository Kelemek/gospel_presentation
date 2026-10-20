import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { parseCcelScougalLifeXml } from '@/lib/scougalLifeOfGod/ccelScougalLifeOfGodHtml'
import { SCOUGAL_LIFE_OF_GOD_SLUG } from '@/lib/scougalLifeOfGod/scougalLifeOfGodSlug'

const PART_SNIPPET = `
<div1 title="Part I. On Religion; the Natural Divine Life; and the exemplification of Divine Love in our blessed Savior" id="ii" prev="i" next="iii">
<h3 id="ii-p0.1">PART I.</h3>
<p id="ii-p1">See <scripRef passage="John 17:3" osisRef="Bible:John.17.3">John 17:3</scripRef>.</p>
</div1>
`

const TITLE_PAGE_SNIPPET = `
<div1 title="Title Page" id="i" prev="toc" next="ii">
<h2 id="i-p3.4">SOUL OF MAN</h2>
</div1>
`

const INDEXES_SNIPPET = `
<div1 title="Indexes" id="v">
<div2 title="Index of Pages of the Print Edition" id="v.i">
  <h2 id="v.i-p0.1">Index of Pages of the Print Edition</h2>
</div2>
</div1>
`

describe('parseCcelScougalLifeXml', () => {
  it('parses Part div1 into subsections with passage keys', () => {
    const parsed = parseCcelScougalLifeXml(PART_SNIPPET + TITLE_PAGE_SNIPPET)
    expect(parsed.slug).toBe(SCOUGAL_LIFE_OF_GOD_SLUG)
    expect(parsed.gospelSection.section).toBe(SCOUGAL_LIFE_OF_GOD_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[0].title).toContain('Part I.')
    expect(parsed.gospelSection.subsections[0].content).toContain('John 17:3')
    expect(parsed.passageKeys.some((k) => k.startsWith('JHN.17'))).toBe(true)
  })

  it('skips Indexes div1', () => {
    const parsed = parseCcelScougalLifeXml(PART_SNIPPET + INDEXES_SNIPPET)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
  })

  it('throws when no chapter blocks are present', () => {
    expect(() => parseCcelScougalLifeXml(TITLE_PAGE_SNIPPET)).toThrow(/No Life of God/)
  })

  it('finalizeGospelDataForImport normalizes scripture in stored HTML', () => {
    const parsed = parseCcelScougalLifeXml(PART_SNIPPET)
    const { gospelData } = finalizeGospelDataForImport([parsed.gospelSection], {
      additionalPassageKeys: parsed.passageKeys,
    })
    const html = gospelData[0].subsections[0].content
    expect(html).toContain('John 17:3')
    expect(html).not.toMatch(/\bJohn\.\s*17:3/)
  })
})
