import { div2InnerToSubsectionHtml, parseCcelMorneveXml } from '@/lib/spurgeon/ccelMorneveHtml'

const SAMPLE_DIV2 = `
<div2 title="Morning, January 1" id="d0101am">
<p class="crossref"><a href="#d0101pm">Go To Evening Reading</a></p>
<p class="passage"><i>"They did eat of the fruit of the land of Canaan that year."</i></p>
<scripCom type="Meditation" passage="Jos 5:12" />
<h3 class="scripPassage"><scripRef passage="Jos 5:12">Joshua 5:12</scripRef></h3>
<p class="normal">Israel’s weary wanderings were all over.</p>
</div2>
`

describe('ccelMorneveHtml', () => {
  it('div2InnerToSubsectionHtml strips crossref and expands scripRef', () => {
    const html = div2InnerToSubsectionHtml(SAMPLE_DIV2)
    expect(html).not.toContain('Go To Evening')
    expect(html).toContain('Joshua 5:12')
    expect(html).toContain('Israel')
  })

  it('parseCcelMorneveXml pairs morning and evening for a day', () => {
    const xml = `
      <ThML.body>
        ${SAMPLE_DIV2}
        <div2 title="Evening, January 1" id="d0101pm">
          <p class="passage"><i>"Evening quote"</i></p>
          <h3 class="scripPassage"><scripRef passage="Ps 63:5">Psalm 63:5</scripRef></h3>
          <p class="normal">Evening meditation text.</p>
        </div2>
      </ThML.body>
    `
    const days = parseCcelMorneveXml(xml)
    expect(days).toHaveLength(1)
    expect(days[0].slug).toBe('me0101')
    expect(days[0].title).toBe('January 1')
    expect(days[0].gospelSection.subsections).toHaveLength(2)
    expect(days[0].gospelSection.subsections[0].title).toBe('Morning')
    expect(days[0].gospelSection.subsections[1].title).toBe('Evening')
    expect(days[0].passageKeys.length).toBeGreaterThanOrEqual(2)
  })

  it('uses full book name from scripRef inner text (Ec 10:7 → Ecclesiastes 10:7)', () => {
    const body = `
      <ThML.body>
        <div2 title="Morning, May 19" id="d0519am">
          <h3 class="scripPassage"><scripRef passage="Ec 10:7">Ecclesiastes 10:7</scripRef></h3>
          <p class="normal">Body.</p>
        </div2>
        <div2 title="Evening, May 19" id="d0519pm">
          <h3 class="scripPassage"><scripRef passage="Ps 23:1">Psalm 23:1</scripRef></h3>
          <p class="normal">Evening body.</p>
        </div2>
      </ThML.body>
    `
    const days = parseCcelMorneveXml(body)
    expect(days[0].gospelSection.subsections[0].content).toContain('Ecclesiastes 10:7')
    expect(days[0].gospelSection.subsections[0].content).not.toContain('Ec 10:7')
  })
})
