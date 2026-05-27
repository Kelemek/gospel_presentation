import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { parseCcelAllOfGraceXml } from '@/lib/allOfGrace/ccelAllOfGraceHtml'
import { ALL_OF_GRACE_SLUG } from '@/lib/allOfGrace/allOfGraceSlug'

const CHAPTER_SNIPPET = `
<div1 title="God Justifieth the Ungodly" id="iv" prev="iii" next="v">
<h2 id="iv-p0.1">GOD JUSTIFIETH THE UNGODLY</h2>
<p id="iv-p1">See <scripRef passage="Romans 8:33" osisRef="Bible:Rom.8.33">Romans 8:33</scripRef>.</p>
<p id="iv-p2">Paul, in <scripRef passage="Romans 3:21-26" osisRef="Bible:Rom.3.21-Rom.3.26">Romans 3:21-26</scripRef>.</p>
</div1>
`

const TITLE_PAGE_SNIPPET = `
<div1 title="Title Page" id="i" prev="toc" next="ii">
<h1 id="i-p0.1">ALL of GRACE</h1>
<p class="Centered" id="i-p5"><scripRef passage="Romans 5:20" osisRef="Bible:Rom.5.20">Romans 5:20</scripRef></p>
</div1>
`

const QUOTED_TITLE_SNIPPET = `
<div1 title="&quot;It Is God That Justifieth&quot;" id="v" prev="iv" next="vi">
<h2 id="v-p0.1">"IT IS GOD THAT JUSTIFIETH"</h2>
<p id="v-p1"><scripRef passage="Micah 7:18" osisRef="Bible:Mic.7.18">Micah 7:18</scripRef></p>
</div1>
`

describe('parseCcelAllOfGraceXml', () => {
  it('parses div1 chapters into subsections with passage keys', () => {
    const parsed = parseCcelAllOfGraceXml(CHAPTER_SNIPPET + TITLE_PAGE_SNIPPET)
    expect(parsed.slug).toBe(ALL_OF_GRACE_SLUG)
    expect(parsed.gospelSection.section).toBe(ALL_OF_GRACE_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[0].title).toBe('God Justifieth the Ungodly')
    expect(parsed.gospelSection.subsections[0].content).toContain('Romans 8:33')
    expect(parsed.passageKeys.some((k) => k.startsWith('ROM.8'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('ROM.3'))).toBe(true)
  })

  it('decodes HTML entities in div1 titles', () => {
    const parsed = parseCcelAllOfGraceXml(QUOTED_TITLE_SNIPPET)
    expect(parsed.gospelSection.subsections[0].title).toBe('"It Is God That Justifieth"')
    expect(parsed.passageKeys.some((k) => k.startsWith('MIC.7'))).toBe(true)
  })

  it('throws when no chapter blocks are present', () => {
    expect(() => parseCcelAllOfGraceXml(TITLE_PAGE_SNIPPET)).toThrow(/No All of Grace div1/)
  })

  it('finalizeGospelDataForImport normalizes scripture in stored HTML', () => {
    const parsed = parseCcelAllOfGraceXml(CHAPTER_SNIPPET)
    const { gospelData } = finalizeGospelDataForImport([parsed.gospelSection], {
      additionalPassageKeys: parsed.passageKeys,
    })
    const html = gospelData[0].subsections[0].content
    expect(html).toContain('Romans 8:33')
    expect(html).not.toMatch(/\bRom\.\s*8:33/)
  })
})
