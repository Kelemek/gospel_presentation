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
  repairGospelPresentationDataRomanOneMerges,
  repairSpurgeonSubsectionsMislumpedRomanOne,
} from '@/lib/spurgeon/ccelSermonHtml'

describe('ccelSermonHtml', () => {
  it('unwrapScripRefTags expands passage attributes to canonical display for inline scripture', () => {
    const s = '<scripRef passage="John 3:16">Jn 3:16</scripRef> text'
    expect(unwrapScripRefTags(s)).toBe('John 3:16 text')
  })

  it('normalizedPassageDisplayForInline expands typical ThML book abbreviations', () => {
    expect(normalizedPassageDisplayForInline('Rom 8:28')).toBe('Romans 8:28')
    expect(normalizedPassageDisplayForInline('john 12:37')).toBe('John 12:37')
    expect(normalizedPassageDisplayForInline('Ec 10:7')).toBe('Ecclesiastes 10:7')
  })

  it('normalizedPassageDisplayForInline handles Watson period-separated refs', () => {
    expect(normalizedPassageDisplayForInline('Ep. 2. 1')).toBe('Ephesians 2:1')
    expect(normalizedPassageDisplayForInline('He. 11. 26')).toBe('Hebrews 11:26')
    expect(normalizedPassageDisplayForInline('Go. 37. 9')).toBe('Genesis 37:9')
    expect(normalizedPassageDisplayForInline('Philippians 4. 11')).toBe('Philippians 4:11')
    expect(normalizedPassageDisplayForInline('Can. 2:1')).toBe('Song of Songs 2:1')
    expect(normalizedPassageDisplayForInline('Mat. 7. 22, 23')).toBe('Matthew 7:22-23')
    expect(normalizedPassageDisplayForInline('Es. 3. 1')).toBe('Esther 3:1')
  })

  it('unwrapScripRefTags resolves Esther osisRef to canonical display', () => {
    expect(
      unwrapScripRefTags(
        '<scripRef passage="Es. 3. 1" osisRef="Bible:Esth.3.1">Es. 3. 1</scripRef>'
      )
    ).toBe('Esther 3:1')
    expect(
      unwrapScripRefTags('<scripRef passage="Ep. 2. 1">Ep. 2. 1</scripRef>')
    ).toBe('Ephesians 2:1')
    expect(
      unwrapScripRefTags('<scripRef passage="Go. 37. 9">Go. 37. 9</scripRef>')
    ).toBe('Genesis 37:9')
  })

  it('expandScripRefsToInlinePlain prefers inner text over abbreviated passage attribute', () => {
    const s =
      '<scripRef passage="Ec 10:7" parsed="|Eccl|10|7|0|0">Ecclesiastes 10:7</scripRef>'
    expect(unwrapScripRefTags(s)).toBe('Ecclesiastes 10:7')
  })

  it('expandScripRefsToInlinePlain uses osisRef for Roman-numeral CCEL refs', () => {
    const s =
      '<scripRef passage="Romans viii. 28" osisRef="Bible:Rom.8.28">Romans viii. 28</scripRef>'
    expect(unwrapScripRefTags(s)).toBe('Romans 8:28')
  })

  it('expandScripRefsToInlinePlain uses osisRef when inner is verse-only', () => {
    const s =
      '<scripRef passage="1Kings 3:10" osisRef="Bible:1Kgs.3.10">verse 10</scripRef>'
    expect(unwrapScripRefTags(s)).toBe('1 Kings 3:10')
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

  it('repairSpurgeonSubsectionsMislumpedRomanOne splits merged I. So, first, … into two subsections', () => {
    const merged = [
      {
        title: '(No. 1) Intro line.',
        content:
          '<p>(No. 1) Intro line.</p>\n<p>More intro text.</p>\n<p>I. So, first, JESUS CHRIST came by water.</p>\n<p>Still under the first head.</p>',
        questions: [],
      },
    ]
    const { subsections, changed } = repairSpurgeonSubsectionsMislumpedRomanOne(merged)
    expect(changed).toBe(true)
    expect(subsections).toHaveLength(2)
    expect(subsections[0].content).toContain('More intro')
    expect(subsections[0].content).not.toContain('I. So, first')
    expect(subsections[1].title).toMatch(/^I\. So, first/)
    expect(subsections[1].content).toContain('Still under the first head')
  })

  it('repairSpurgeonSubsectionsMislumpedRomanOne re-attaches numbered nested blocks after a merged Roman I.', () => {
    const merged = [
      {
        title: 'Intro',
        content:
          '<p>Opening intro only.</p>\n<p>I. So, first main head starts here.</p>\n<p>More exposition under I before any number.</p>',
        nestedSubsections: [
          {
            title: '1. I shall offer first sub-point text.',
            content: '<p>1. I shall offer first sub-point text.</p>\n<p>Continuation of first sub-point.</p>',
          },
          {
            title: '2. He changes not in the second sub-point.',
            content: '<p>2. He changes not in the second sub-point.</p>',
          },
        ],
        questions: [],
      },
    ]
    const { subsections, changed } = repairSpurgeonSubsectionsMislumpedRomanOne(merged)
    expect(changed).toBe(true)
    expect(subsections).toHaveLength(2)
    expect(subsections[0].content).toContain('Opening intro')
    expect(subsections[0].nestedSubsections?.length ?? 0).toBe(0)
    expect(subsections[1].nestedSubsections).toHaveLength(2)
    expect(subsections[1].content).toContain('I. So, first main')
    expect(subsections[1].content).not.toContain('1. I shall offer')
  })

  it('repairSpurgeonSubsectionsMislumpedRomanOne does not split on pronoun I. mid-subsection', () => {
    const merged = [
      {
        title: 'One block',
        content: '<p>He promised peace.</p>\n<p>I. will never leave you nor forsake you.</p>',
        questions: [],
      },
    ]
    const { subsections, changed } = repairSpurgeonSubsectionsMislumpedRomanOne(merged)
    expect(changed).toBe(false)
    expect(subsections).toHaveLength(1)
  })

  it('repairSpurgeonSubsectionsMislumpedRomanOne merges legacy false Roman I. Without further preface subsection', () => {
    const legacy = [
      { title: '(No. 2636)', content: '<p>Intro paragraph before the transitional line.</p>', questions: [] },
      {
        title: 'I. Without further preface, I remark, first…',
        content:
          '<p>I. Without further preface, I remark, first, that THE WORDS OF JESUS MUST STAND.</p><p>More under the first notional head.</p>',
        questions: [],
      },
      { title: 'II. Now, secondly', content: '<p>II. Now, secondly, THIS DECLARATION APPLIES.</p>', questions: [] },
    ]
    const { subsections, changed } = repairSpurgeonSubsectionsMislumpedRomanOne(legacy)
    expect(changed).toBe(true)
    expect(subsections).toHaveLength(2)
    expect(subsections[0].content).toContain('Intro paragraph')
    expect(subsections[0].content).toContain('I. Without further preface')
    expect(subsections[1].title).toMatch(/^II\./i)
  })

  it('repairGospelPresentationDataRomanOneMerges is a no-op on already-split div1 output', () => {
    const inner = `
      <p class="Body">(No. 1) Short intro line.</p>
      <p class="Body">More intro without a new heading.</p>
      <p class="Body">I. First of all, the first main head begins here.</p>
      <p class="Body">Continuation still under point one.</p>
      <p class="Body">II. Secondly, the next division starts.</p>
      <p class="Body">Only one paragraph under II.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    const gospelData = [
      {
        section: '1',
        title: 'Sermon',
        subsections,
      },
    ]
    const r = repairGospelPresentationDataRomanOneMerges(gospelData)
    expect(r.changed).toBe(false)
    expect(r.gospelData).toBe(gospelData)
  })

  it('div1XmlToGospelSubsections splits Sermon 858 style I. In discussing… from intro', () => {
    const inner = `
      <p class="Body">(No. 858) Intro paragraph.</p>
      <p class="Body">I. In discussing this text I shall first remind you of the ONE GLORIOUS PERSON.</p>
      <p class="Body">More under I.</p>
      <p class="Body">II. Secondly, there are TWO PRECIOUS DOCTRINES.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    expect(subsections).toHaveLength(3)
    expect(subsections[0].content).toContain('Intro paragraph')
    expect(subsections[0].content).not.toContain('I. In discussing')
    expect(subsections[1].title).toMatch(/I\. In discussing/i)
    expect(subsections[2].title).toMatch(/^II\./i)
  })

  it('div1XmlToGospelSubsections splits on I. So, first, … style Roman heads', () => {
    const inner = `
      <p class="Body">(No. 1) Intro ends here.</p>
      <p class="Body">I. So, first, JESUS CHRIST came by water—it was His purpose to purify.</p>
      <p class="Body">More under the first head.</p>
      <p class="Body">II. Secondly, He came by blood.</p>
      <p class="Body">Closing under II.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    expect(subsections).toHaveLength(3)
    expect(subsections[0].content).toContain('Intro ends')
    expect(subsections[0].content).not.toContain('I. So, first')
    expect(subsections[1].title).toMatch(/^I\. So, first/)
    expect(subsections[1].content).toContain('More under the first')
    expect(subsections[2].title).toMatch(/^II\. Secondly/)
    expect(subsections[2].content).toContain('Closing under II')
  })

  it('Sermon 2636 shape: I. Without further preface stays in first subsection until II and III', () => {
    const inner = `
      <p id="x-p1">(No. 2636)</p>
      <p id="x-p2">LAST Lord's-Day morning I preached upon the perpetuity of the Law of God…</p>
      <p id="x-p9">I. Without further preface, I remark, first, that THE WORDS OF JESUS MUST STAND, COME WHAT MAY.</p>
      <p id="x-p10">The major change of Heaven and earth passing away includes all lesser changes…</p>
      <p id="x-p19">II. Now, secondly, THIS DECLARATION APPLIES TO ALL CHRIST'S WORDS</p>
      <p id="x-p20">This declaration applies, then, to the Doctrinal teaching of Christ.</p>
      <p id="x-p29">III. Thirdly, and lastly, I want to show you that THIS TRUTH HAS A BEARING UPON US ALL.</p>
      <p id="x-p30">First, I am sure that it has a relation to the preacher.</p>
    `
    const { subsections } = div1XmlToGospelSubsections(inner)
    expect(subsections).toHaveLength(3)
    expect(subsections[0].content).toContain('I. Without further preface')
    expect(subsections[0].content).toContain('The major change of Heaven')
    expect(subsections[0].title).toMatch(/\(No\. 2636\)/)
    expect(subsections[1].title).toMatch(/^II\./i)
    expect(subsections[2].title).toMatch(/^III\./i)
  })

  it('isMajorOutlineSegmentStart vs isNumberedSubpointStart', () => {
    expect(isMajorOutlineSegmentStart('I. First of all, we begin.')).toBe(true)
    expect(isMajorOutlineSegmentStart('I. So, first, JESUS CHRIST came by water.')).toBe(true)
    expect(isMajorOutlineSegmentStart('I. Therefore we must believe.')).toBe(true)
    expect(
      isMajorOutlineSegmentStart(
        'I. In discussing this text I shall first remind you of the ONE GLORIOUS PERSON concerning whom this verse is written.'
      )
    ).toBe(true)
    expect(
      isMajorOutlineSegmentStart(
        'I. Without further preface, I remark, first, that THE WORDS OF JESUS MUST STAND, COME WHAT MAY.'
      )
    ).toBe(false)
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

  it('parseCcelVolumeSermons skips div1 when no catalog from body or title (no positional slug)', () => {
    const xml = `
      <body>
        <div1 title="Publisher Preface">
          <p class="Body">This block has outline prose but no (No. N) line and no Sermon N. title pattern.</p>
        </div1>
      </body>
    `
    const sermons = parseCcelVolumeSermons(xml, { limit: 5 })
    expect(sermons).toHaveLength(0)
  })
})
