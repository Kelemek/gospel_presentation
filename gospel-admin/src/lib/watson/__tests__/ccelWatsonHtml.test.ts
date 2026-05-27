import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { parseCcelWatsonXml } from '@/lib/watson/ccelWatsonHtml'
import { watsonBookById } from '@/lib/watson/watsonCcelManifest'
import { WATSON_BEATITUDES_SLUG, WATSON_DIVINITY_SLUG } from '@/lib/watson/watsonSlug'

const BEATITUDES_SNIPPET = `
<div1 title="Title Page" id="i">
<p id="i-p1">Title</p>
</div1>
<div1 title="4. Blessed are the poor in spirit" id="iv">
<p id="iv-p1">See <scripRef passage="Matthew 5:3" osisRef="Bible:Matt.5.3">Matthew 5:3</scripRef>.</p>
</div1>
`

const DIVINITY_SNIPPET = `
<div1 title="Brief Memoir Of Thomas Watson " id="iii">
<p id="iii-p1">Memoir only.</p>
</div1>
<div1 title="3. God and his creation " id="vi">
<div2 title="1. The Being Of God " id="vi.i">
<p id="vi.i-p1">God is <scripRef passage="Exodus 3:14" osisRef="Bible:Exod.3.14">Exodus 3:14</scripRef>.</p>
</div2>
</div1>
`

describe('parseCcelWatsonXml', () => {
  it('parses beatitudes div1 chapters and skips title page', () => {
    const book = watsonBookById('beatitudes')
    const parsed = parseCcelWatsonXml(BEATITUDES_SNIPPET, book)
    expect(parsed.slug).toBe(WATSON_BEATITUDES_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[0].title).toBe('4. Blessed are the poor in spirit')
    expect(parsed.gospelSection.subsections[0].content).toContain('Matthew 5:3')
    expect(parsed.passageKeys.some((k) => k.startsWith('MAT.5'))).toBe(true)
  })

  it('parses divinity div2 units under part div1 and skips memoir', () => {
    const book = watsonBookById('divinity')
    const parsed = parseCcelWatsonXml(DIVINITY_SNIPPET, book)
    expect(parsed.slug).toBe(WATSON_DIVINITY_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[0].title).toContain('God and his creation')
    expect(parsed.gospelSection.subsections[0].title).toContain('The Being Of God')
    expect(parsed.passageKeys.some((k) => k.startsWith('EXO.3'))).toBe(true)
  })

  it('finalizeGospelDataForImport normalizes scripture in stored HTML', () => {
    const book = watsonBookById('beatitudes')
    const parsed = parseCcelWatsonXml(BEATITUDES_SNIPPET, book)
    const { gospelData } = finalizeGospelDataForImport([parsed.gospelSection], {
      additionalPassageKeys: parsed.passageKeys,
    })
    expect(gospelData[0].subsections[0].content).toContain('Matthew 5:3')
  })
})
