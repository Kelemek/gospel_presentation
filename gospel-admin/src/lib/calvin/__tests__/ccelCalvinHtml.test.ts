import { getCalvinVolume } from '@/lib/calvin/calvinCcelManifest'
import { parseCcelCalvinVolume } from '@/lib/calvin/ccelCalvinHtml'

const GENESIS_SNIPPET = `
<div1 type="chapter" title="Chapter 1" id="vii">
<div2 type="scripture" title="Genesis 1:1-31" id="vii.i">
<p><scripRef passage="Genesis 1:1-31" osisRef="Bible:Gen.1.1-Gen.1.31">Genesis 1:1-31</scripRef></p>
<p>In the beginning.</p>
</div2>
</div1>
`

const JOEL_BOOK_SNIPPET = `
<div1 type="Book" title="Commentary on Joel" id="iii">
<div2 type="Chapter" title="Chapter 1" id="iii.ii">
<p><scripRef passage="Joel 1:1-4" osisRef="Bible:Joel.1.1-Joel.1.4">Joel 1:1-4</scripRef></p>
<p>The word of the Lord.</p>
</div2>
</div1>
`

describe('parseCcelCalvinVolume', () => {
  it('parses Genesis-style scripture div2 units', () => {
    const vol = getCalvinVolume('calcom01')!
    const chunks = parseCcelCalvinVolume(GENESIS_SNIPPET, vol)
    const gen = chunks.find((c) => c.bookUsfm === 'GEN')
    expect(gen).toBeDefined()
    expect(gen!.subsections.length).toBeGreaterThanOrEqual(1)
    expect(gen!.subsections[0].title).toContain('Genesis 1:1')
    expect(gen!.passageKeys.some((k) => k.startsWith('GEN.1'))).toBe(true)
  })

  it('routes multi-book volume div1 Book blocks', () => {
    const vol = getCalvinVolume('calcom27')!
    const chunks = parseCcelCalvinVolume(JOEL_BOOK_SNIPPET, vol)
    const joel = chunks.find((c) => c.bookUsfm === 'JOL')
    expect(joel).toBeDefined()
    expect(joel!.subsections.length).toBeGreaterThanOrEqual(1)
  })

  it('keeps standard single-book volumes on manifest book despite cross-refs', () => {
    const vol = getCalvinVolume('calcom38')!
    const snippet = `
<div1 type="chapter" title="Chapter 12" id="xii">
<div2 type="scripture" title="Romans 12:4-8" id="xii.iv">
<p><scripRef passage="Romans 12:4-8" osisRef="Bible:Rom.12.4-Rom.12.8">Romans 12:4-8</scripRef></p>
<p>See <scripRef passage="1Co 12:9" osisRef="Bible:1Cor.12.9">1 Corinthians 12:9</scripRef> and
<scripRef passage="1Co 12:11" osisRef="Bible:1Cor.12.11">1 Corinthians 12:11</scripRef>.</p>
</div2>
</div1>
`
    const chunks = parseCcelCalvinVolume(snippet, vol)
    expect(chunks.find((c) => c.bookUsfm === '1CO')).toBeUndefined()
    const rom = chunks.find((c) => c.bookUsfm === 'ROM')
    expect(rom).toBeDefined()
    expect(rom!.subsections.length).toBeGreaterThanOrEqual(1)
  })

  it('routes harmony Law volume blocks by dominant scripRef book', () => {
    const vol = getCalvinVolume('calcom03')!
    const snippet = `
<div1 type="chapter" title="Chapter 20" id="xx">
<div2 type="scripture" title="Exodus 20:1-17" id="xx.i">
<p><scripRef passage="Exodus 20:1-17" osisRef="Bible:Exo.20.1-Exo.20.17">Exodus 20:1-17</scripRef></p>
</div2>
</div1>
`
    const chunks = parseCcelCalvinVolume(snippet, vol)
    const exo = chunks.find((c) => c.bookUsfm === 'EXO')
    expect(exo).toBeDefined()
    expect(exo!.subsections[0].title).toContain('Exodus 20')
  })
})
