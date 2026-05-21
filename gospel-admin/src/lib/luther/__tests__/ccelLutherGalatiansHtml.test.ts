import { parseCcelLutherGalatiansXml } from '@/lib/luther/ccelLutherGalatiansHtml'
import { LUTHER_GALATIANS_SLUG } from '@/lib/luther/lutherSlug'

const CHAPTER_SNIPPET = `
<div1 type="Chapter" n="3" title="Galatians 3" shorttitle="Chapter 3" id="vi">
<h3 id="vi-p0.1">CHAPTER III</h3>
<scripCom type="Commentary" passage="Gal. 3" osisRef="Bible:Gal.3" />
<p class="text" id="vi-p1"><span class="sc">Verse</span> 1. <i>O foolish Galatians.</i></p>
<p id="vi-p2">Paul calls the Galatians foolish because they began in the Spirit.</p>
<p id="vi-p3">See <scripRef passage="Romans 3:28" osisRef="Bible:Rom.3.28">Romans 3:28</scripRef> and
<scripRef passage="Galatians 3:10" osisRef="Bible:Gal.3.10">Galatians 3:10</scripRef>.</p>
</div1>
`

const NON_CHAPTER_SNIPPET = `
<div1 title="Preface" id="ii">
<p id="ii-p1">Editorial preface only.</p>
</div1>
`

describe('parseCcelLutherGalatiansXml', () => {
  it('parses Chapter div1 blocks into subsections with passage keys', () => {
    const parsed = parseCcelLutherGalatiansXml(CHAPTER_SNIPPET + NON_CHAPTER_SNIPPET)
    expect(parsed.slug).toBe(LUTHER_GALATIANS_SLUG)
    expect(parsed.gospelSection.section).toBe(LUTHER_GALATIANS_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[0].title).toBe('Galatians 3')
    expect(parsed.gospelSection.subsections[0].content).toContain('foolish Galatians')
    expect(parsed.gospelSection.subsections[0].content).toContain('Romans 3:28')
    expect(parsed.passageKeys.some((k) => k.startsWith('GAL.3'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('ROM.3'))).toBe(true)
  })

  it('throws when no chapter blocks are present', () => {
    expect(() => parseCcelLutherGalatiansXml(NON_CHAPTER_SNIPPET)).toThrow(/No Galatians chapter/)
  })
})
