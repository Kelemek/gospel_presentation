import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { parseCcelLutherBondageXml } from '@/lib/lutherBondage/ccelLutherBondageHtml'
import { LUTHER_BONDAGE_SLUG } from '@/lib/lutherBondage/lutherBondageSlug'

const INTRO_SNIPPET = `
<div1 title="Introduction" id="v">
<p class="normal" id="v-p1">Free will is not neutral. <scripRef passage="Acts 20:28" osisRef="Bible:Acts.20.28">Acts 20.28</scripRef></p>
</div1>
`

const DISCUSSION_PART_SNIPPET = `
<div1 title="Discussion: First Part" id="xi">
<h2 id="xi-p0.1">DISCUSSION.</h2>
<div2 title="Section I." id="xi.i">
<p class="normal" id="xi.i-p1">First section. <scripRef passage="John 1:13" osisRef="Bible:John.1.13">John 1.13</scripRef></p>
</div2>
<div2 title="Section II." id="xi.ii">
<p class="normal" id="xi.ii-p1">Second section.</p>
</div2>
</div1>
`

const INDEXES_SNIPPET = `
<div1 title="Indexes" id="xvi">
<p id="xvi-p1">Index only</p>
</div1>
`

describe('parseCcelLutherBondageXml', () => {
  it('parses prefatory div1 and discussion parts with div2 subsections', () => {
    const parsed = parseCcelLutherBondageXml(
      INTRO_SNIPPET +
        DISCUSSION_PART_SNIPPET +
        `<div1 title="Discussion: Second Part" id="xii"><div2 title="Section I." id="xii.i"><p class="normal">B</p></div2></div1>` +
        `<div1 title="Discussion: Third Part" id="xiii"><div2 title="Section I." id="xiii.i"><p class="normal">C</p></div2></div1>` +
        INDEXES_SNIPPET
    )
    expect(parsed.slug).toBe(LUTHER_BONDAGE_SLUG)
    expect(parsed.gospelData).toHaveLength(4)
    expect(parsed.gospelData[0].section).toBe('prefatory')
    expect(parsed.gospelData[0].subsections).toHaveLength(1)
    expect(parsed.gospelData[0].subsections[0].title).toBe('Introduction')
    expect(parsed.gospelData[0].subsections[0].content).toContain('Acts 20:28')

    const discussion = parsed.gospelData.find((s) => s.section === 'discussion-1')
    expect(discussion?.subsections).toHaveLength(2)
    expect(discussion?.subsections[0].title).toContain('Section I.')
    expect(discussion?.subsections[0].content).toContain('John 1:13')
    expect(parsed.passageKeys.some((k) => k.startsWith('ACT.20'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('JHN.1'))).toBe(true)
  })

  it('throws when discussion parts are missing', () => {
    expect(() => parseCcelLutherBondageXml(INTRO_SNIPPET + INDEXES_SNIPPET)).toThrow(
      /Expected 3 Discussion Part/
    )
  })

  it('finalizeGospelDataForImport normalizes scripture in stored HTML', () => {
    const parsed = parseCcelLutherBondageXml(
      INTRO_SNIPPET +
        DISCUSSION_PART_SNIPPET +
        `<div1 title="Discussion: Second Part"><div2 title="Section I."><p class="normal">x</p></div2></div1>` +
        `<div1 title="Discussion: Third Part"><div2 title="Section I."><p class="normal">y</p></div2></div1>`
    )
    const { gospelData } = finalizeGospelDataForImport(parsed.gospelData, {
      additionalPassageKeys: parsed.passageKeys,
    })
    const html = gospelData[0].subsections[0].content
    expect(html).toContain('Acts 20:28')
    expect(html).not.toMatch(/\bActs\.\s*20\.28/)
  })
})
