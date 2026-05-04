import {
  unwrapScripRefTags,
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  slugForSermonNumber,
  extractSermonCatalogNumberFromDiv1Title,
  div1XmlToGospelSubsections,
  isOutlineSegmentStart,
  isMajorOutlineSegmentStart,
  isNumberedSubpointStart,
  parseCcelVolumeSermons,
} from '@/lib/spurgeon/ccelSermonHtml'

describe('ccelSermonHtml', () => {
  it('unwrapScripRefTags expands passage attributes to canonical display for inline scripture', () => {
    const s = '<scripRef passage="John 3:16">Jn 3:16</scripRef> text'
    expect(unwrapScripRefTags(s)).toBe('John 3:16 text')
  })

  it('normalizedPassageDisplayForInline expands typical ThML book abbreviations', () => {
    expect(normalizedPassageDisplayForInline('Rom 8:28')).toBe('Romans 8:28')
    expect(normalizedPassageDisplayForInline('john 12:37')).toBe('John 12:37')
  })

  it('extractPassageAttributes collects passage attributes', () => {
    const s = '<scripCom passage="Rom 8:28"/> and <scripRef passage="Psalm 23:1">Ps 23:1</scripRef>'
    expect(extractPassageAttributes(s)).toEqual(['Rom 8:28', 'Psalm 23:1'])
  })

  it('slugForSermonNumber pads sermon number', () => {
    expect(slugForSermonNumber(1)).toBe('sg00001')
    expect(slugForSermonNumber(12345)).toBe('sg12345')
  })

  it('extractSermonCatalogNumberFromDiv1Title reads CCEL-style Sermon N. titles', () => {
    expect(extractSermonCatalogNumberFromDiv1Title('Sermon 62. Exposition: 1 John 3:1-10')).toBe(62)
    expect(extractSermonCatalogNumberFromDiv1Title('  sermon 9. Foo')).toBe(9)
    expect(extractSermonCatalogNumberFromDiv1Title('First Sermon')).toBe(null)
  })

  it('div1XmlToGospelSubsections merges non-outline Body paragraphs into one subsection', () => {
    const inner = `
      <p class="Body">(No. 7) Intro <scripRef passage="John 1:1">Jn 1:1</scripRef></p>
      <p class="Body">Second paragraph without outline marker.</p>
    `
    const { subsections, sermonNo } = div1XmlToGospelSubsections(inner)
    expect(sermonNo).toBe(7)
    expect(subsections).toHaveLength(1)
    expect(subsections[0].scriptureReferences).toBeUndefined()
    expect(subsections[0].content).toContain('John 1:1')
    expect(subsections[0].content).not.toContain('scripRef')
    expect(subsections[0].content).toContain('Second paragraph')
    expect(subsections[0].content.match(/<p>/g)?.length).toBe(2)
  })

  it('div1XmlToGospelSubsections splits on Roman outline and merges until next marker', () => {
    const inner = `
      <p class="Body">(No. 1) Short intro line.</p>
      <p class="Body">More intro without a new heading.</p>
      <p class="Body">I. First of all, the first main head begins here.</p>
      <p class="Body">Continuation still under point one.</p>
      <p class="Body">II. Secondly, the next division starts.</p>
      <p class="Body">Only one paragraph under II.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    expect(subsections).toHaveLength(3)
    expect(subsections[0].title).toMatch(/\(No\. 1\)/)
    expect(subsections[0].content).toContain('More intro')
    expect(subsections[0].content).not.toContain('I. First')
    expect(subsections[1].title).toMatch(/^I\. First/)
    expect(subsections[1].content).toContain('Continuation still under')
    expect(subsections[2].title).toMatch(/^II\. Secondly/)
    expect(subsections[2].content).toContain('Only one paragraph')
  })

  it('isMajorOutlineSegmentStart vs isNumberedSubpointStart', () => {
    expect(isMajorOutlineSegmentStart('I. First of all, we begin.')).toBe(true)
    expect(isMajorOutlineSegmentStart('I. will never leave you.')).toBe(false)
    expect(isMajorOutlineSegmentStart('II. The second point.')).toBe(true)
    expect(isMajorOutlineSegmentStart('FIRST. We observe that God is good.')).toBe(true)
    expect(isMajorOutlineSegmentStart('1. I shall offer exposition.')).toBe(false)

    expect(isNumberedSubpointStart('1. I shall offer exposition.')).toBe(true)
    expect(isNumberedSubpointStart('1. First, we observe that God is good.')).toBe(true)
    expect(isNumberedSubpointStart('2. He changes not.')).toBe(true)
    expect(isNumberedSubpointStart('3. Then again, we see grace.')).toBe(true)
    expect(isNumberedSubpointStart('1. Thus having shown the point.')).toBe(true)
    expect(isNumberedSubpointStart('2. By “the sons of God” he means believers.')).toBe(true)
    expect(isNumberedSubpointStart('I. First of all.')).toBe(false)
    expect(isNumberedSubpointStart('Some plain prose.')).toBe(false)
    expect(isNumberedSubpointStart('1.')).toBe(false)
    expect(isNumberedSubpointStart('123. Too many digits.')).toBe(false)

    expect(isOutlineSegmentStart('1. I shall offer exposition.')).toBe(true)
    expect(isOutlineSegmentStart('II. Next.')).toBe(true)
  })

  it('div1XmlToGospelSubsections nests numbered points under a major Roman head', () => {
    const inner = `
      <p class="Body">(No. 1) Opening intro only.</p>
      <p class="Body">I. First main head starts here.</p>
      <p class="Body">More exposition under I before any number.</p>
      <p class="Body">1. I shall offer first sub-point text.</p>
      <p class="Body">Continuation of first sub-point.</p>
      <p class="Body">2. He changes not in the second sub-point.</p>
      <p class="Body">II. Second main head.</p>
      <p class="Body">Paragraph under II.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    expect(subsections).toHaveLength(3)

    expect(subsections[0].nestedSubsections?.length ?? 0).toBe(0)
    expect(subsections[0].content).toContain('Opening intro')

    expect(subsections[1].nestedSubsections).toHaveLength(2)
    expect(subsections[1].content).toContain('I. First main')
    expect(subsections[1].content).toContain('More exposition under I')
    expect(subsections[1].content).not.toContain('1. I shall offer')
    expect(subsections[1].nestedSubsections![0].title).toMatch(/^1\. I shall/)
    expect(subsections[1].nestedSubsections![0].content).toContain('Continuation of first')
    expect(subsections[1].nestedSubsections![1].title).toMatch(/^2\. He changes/)

    expect(subsections[2].nestedSubsections?.length ?? 0).toBe(0)
    expect(subsections[2].content).toContain('II. Second main')
    expect(subsections[2].content).toContain('Paragraph under II')
  })

  it('div1XmlToGospelSubsections splits numbered subpoints with varied openers (Then, Thus, By)', () => {
    const inner = `
      <p class="Body">(No. 1)</p>
      <p class="Body">I. First main head.</p>
      <p class="Body">1. I shall open the first branch.</p>
      <p class="Body">More under 1.</p>
      <p class="Body">2. He is faithful still.</p>
      <p class="Body">3. Then again, consider his mercy.</p>
      <p class="Body">Under three.</p>
      <p class="Body">4. Yet again, the Lord abides.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    expect(subsections).toHaveLength(2)
    expect(subsections[1].nestedSubsections).toHaveLength(4)
    expect(subsections[1].nestedSubsections![2].title).toMatch(/^3\. Then again/)
    expect(subsections[1].nestedSubsections![2].content).toContain('Under three')
    expect(subsections[1].nestedSubsections![3].title).toMatch(/^4\. Yet again/)
  })

  it('div1XmlToGospelSubsections falls back to id-only and Centered paragraphs when no class="Body"', () => {
    const inner = `
      <p id="xxx-p1">(No. 319)</p>
      <p id="xxx-p2">Opening line without Body class.</p>
      <p class="Centered">"A centered stanza."</p>
      <p id="xxx-p3">I. First main head in id-only paragraph format.</p>
      <p id="xxx-p4">More under first head.</p>
    `
    const { subsections, sermonNo } = div1XmlToGospelSubsections(inner)
    expect(sermonNo).toBe(319)
    expect(subsections).toHaveLength(2)
    expect(subsections[0].content).toContain('Opening line')
    expect(subsections[0].content).toContain('centered stanza')
    expect(subsections[1].title).toMatch(/^I\. First main/)
    expect(subsections[1].content).toContain('More under first head')
  })

  it('parseCcelVolumeSermons extracts limited sermons from div1 blocks', () => {
    const xml = `
      <body>
        <div1 title="First Sermon">
          <p class="Body">(No. 1) Opening <scripCom passage="Genesis 1:1"/></p>
        </div1>
        <div1 title="Second Sermon">
          <p class="Body">(No. 2) More <scripRef passage="Exodus 20:1">Ex 20:1</scripRef></p>
        </div1>
      </body>
    `
    const sermons = parseCcelVolumeSermons(xml, { limit: 5 })
    expect(sermons).toHaveLength(2)
    expect(sermons[0].slug).toBe('sg00001')
    expect(sermons[1].slug).toBe('sg00002')
    expect(sermons[0].passageKeys.length).toBeGreaterThan(0)
  })

  it('parseCcelVolumeSermons uses div1 title when body omits (No. N)', () => {
    const xml = `
      <body>
        <div1 title="Sermon 62. Exposition: 1 John 3:1-10">
          <p class="Body">Opening exposition without a catalog line in the body.</p>
        </div1>
      </body>
    `
    const sermons = parseCcelVolumeSermons(xml, { limit: 5 })
    expect(sermons).toHaveLength(1)
    expect(sermons[0].slug).toBe('sg00062')
    expect(sermons[0].sermonNo).toBe(62)
  })

  it('parseCcelVolumeSermons prefers (No. N) in body over title sermon number', () => {
    const xml = `
      <body>
        <div1 title="Sermon 99. Misleading title">
          <p class="Body">(No. 5) Body catalog wins.</p>
        </div1>
      </body>
    `
    const sermons = parseCcelVolumeSermons(xml, { limit: 5 })
    expect(sermons[0].slug).toBe('sg00005')
    expect(sermons[0].sermonNo).toBe(5)
  })
})
