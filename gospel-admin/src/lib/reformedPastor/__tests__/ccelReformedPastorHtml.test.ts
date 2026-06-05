import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import {
  normalizeThmlHeadingsForImport,
  parseCcelReformedPastorXml,
} from '@/lib/reformedPastor/ccelReformedPastorHtml'
import { REFORMED_PASTOR_SLUG } from '@/lib/reformedPastor/reformedPastorSlug'

const INTRO_SNIPPET = `
<div1 title="THE REFORMED PASTOR " n="i" id="i">
<h2 id="i-p0.1">THE REFORMED PASTOR</h2>
<p id="i.iii-p1">which he hath purchased with his own blood. <scripRef passage="Acts 20:28" osisRef="Bible:Acts.20.28">Acts 20.28</scripRef></p>
</div1>
`

const CHAPTER_SNIPPET = `
<div1 title="CHAPTER 1 " n="ii" id="ii">
<h2 id="ii-p0.1">CHAPTER 1</h2>
<p id="ii.i-p3">expound <scripRef passage="Psalm 50.16-17" osisRef="Bible:Ps.50.16-Ps.50.17">Psalm 50.16-17</scripRef>.</p>
</div1>
`

const INDEXES_SNIPPET = `
<div1 title="Indexes" id="v">
<p id="v-p1">Index only</p>
</div1>
`

/** CCEL CHAPTER 3: h3 incorrectly wraps Body paragraphs (PART I block). */
const MALFORMED_H3_SNIPPET = `
<div1 title="CHAPTER 3 " n="iv" id="iv">
<h3 id="iv.iii-p0.1">PART I </h3>
<h3 id="iv.iii.i-p0.1">
<p class="Body" id="iv.iii.i-p1"><b>1.</b> When I look before me, consider the work.</p>
<p class="Body" id="iv.iii.i-p2"><b>2.</b> Second outline point here.</p>
</h3>
</div1>
`

describe('normalizeThmlHeadingsForImport', () => {
  it('unwraps h3 that contain Body paragraphs and keeps outline bold markers', () => {
    const out = normalizeThmlHeadingsForImport(MALFORMED_H3_SNIPPET)
    expect(out).toContain('<p class="Body"')
    expect(out).toContain('<b>1.</b>')
    expect(out).not.toMatch(/<h3\b/i)
  })

  it('turns short h3 titles into bold lead paragraphs', () => {
    const out = normalizeThmlHeadingsForImport('<h3>PART I </h3><p>Body</p>')
    expect(out).toBe('<p><strong>PART I</strong></p><p>Body</p>')
  })
})

describe('parseCcelReformedPastorXml', () => {
  it('parses div1 units into subsections with passage keys', () => {
    const parsed = parseCcelReformedPastorXml(INTRO_SNIPPET + CHAPTER_SNIPPET + INDEXES_SNIPPET)
    expect(parsed.slug).toBe(REFORMED_PASTOR_SLUG)
    expect(parsed.gospelSection.section).toBe(REFORMED_PASTOR_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(2)
    expect(parsed.gospelSection.subsections[0].title).toBe('THE REFORMED PASTOR')
    expect(parsed.gospelSection.subsections[1].title).toBe('CHAPTER 1')
    expect(parsed.gospelSection.subsections[0].content).toContain('Acts 20:28')
    expect(parsed.passageKeys.some((k) => k.startsWith('ACT.20'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('PSA.50'))).toBe(true)
  })

  it('skips Indexes div1', () => {
    const parsed = parseCcelReformedPastorXml(CHAPTER_SNIPPET + INDEXES_SNIPPET)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[0].title).toBe('CHAPTER 1')
  })

  it('throws when no content div1 blocks are present', () => {
    expect(() => parseCcelReformedPastorXml(INDEXES_SNIPPET)).toThrow(/No Reformed Pastor div1/)
  })

  it('finalizeGospelDataForImport normalizes scripture in stored HTML', () => {
    const parsed = parseCcelReformedPastorXml(INTRO_SNIPPET)
    const { gospelData } = finalizeGospelDataForImport([parsed.gospelSection], {
      additionalPassageKeys: parsed.passageKeys,
    })
    const html = gospelData[0].subsections[0].content
    expect(html).toContain('Acts 20:28')
    expect(html).not.toMatch(/\bActs\.\s*20\.28/)
  })

  it('imports prose inside malformed CCEL h3 wrappers (CHAPTER 3 pattern)', () => {
    const parsed = parseCcelReformedPastorXml(MALFORMED_H3_SNIPPET)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    const html = parsed.gospelSection.subsections[0].content
    expect(html).toContain('<strong>PART I</strong>')
    expect(html).toContain('<b>1.</b> When I look before me')
    expect(html).toContain('<b>2.</b> Second outline point')
  })
})
