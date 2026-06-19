import {
  formatApiBibleJsonPassageContent,
  formatApiBiblePassageContent,
  formatApiBiblePassageText,
  normalizeScriptureCachedText,
  type ApiBibleContentNode,
} from '@/lib/api-bible-format'

const romansOneParaFixture: ApiBibleContentNode[] = [
  {
    name: 'para',
    type: 'tag',
    attrs: { style: 'p' },
    items: [
      {
        name: 'verse',
        type: 'tag',
        attrs: { number: '1', style: 'v', sid: 'ROM 1:1' },
        items: [{ text: '1', type: 'text' }],
      },
      { text: 'Paul, a servant. ', type: 'text' },
      {
        name: 'verse',
        type: 'tag',
        attrs: { number: '2', style: 'v', sid: 'ROM 1:2' },
        items: [{ text: '2', type: 'text' }],
      },
      { text: 'Promised afore.', type: 'text' },
    ],
  },
  {
    name: 'para',
    type: 'tag',
    attrs: { style: 'p' },
    items: [
      {
        name: 'verse',
        type: 'tag',
        attrs: { number: '8', style: 'v', sid: 'ROM 1:8' },
        items: [{ text: '8', type: 'text' }],
      },
      { text: 'First, I thank my God.', type: 'text' },
    ],
  },
]

describe('formatApiBibleJsonPassageContent', () => {
  it('joins API.Bible para nodes with blank lines and bracket verse markers', () => {
    expect(formatApiBibleJsonPassageContent(romansOneParaFixture)).toBe(
      '[1] Paul, a servant. [2] Promised afore.\n\n[8] First, I thank my God.'
    )
  })

  it('is used by formatApiBiblePassageContent for JSON trees', () => {
    expect(formatApiBiblePassageContent(romansOneParaFixture)).toBe(
      formatApiBibleJsonPassageContent(romansOneParaFixture)
    )
  })
})

describe('formatApiBiblePassageText', () => {
  it('preserves bracket verse markers', () => {
    expect(formatApiBiblePassageText('[16] For God so loved')).toBe('[16] For God so loved')
  })

  it('converts line-leading verse numbers to bracket form', () => {
    const raw = '16 For God so loved the world\n17 For God did not send'
    expect(formatApiBiblePassageText(raw)).toBe('[16] For God so loved the world [17] For God did not send')
  })

  it('formats JSON verses array when present', () => {
    const raw = JSON.stringify({
      verses: [
        { verse: 16, text: 'For God so loved' },
        { verse: 17, text: 'For God did not send' },
      ],
    })
    expect(formatApiBiblePassageText(raw)).toBe('[16] For God so loved [17] For God did not send')
  })

  it('keeps non-numbered lines (e.g. section headings) when normalizing line-based text', () => {
    const raw =
      '16 For God so loved the world\nThe Son of Man\n17 For God did not send the Son into the world'
    expect(formatApiBiblePassageText(raw)).toBe(
      '[16] For God so loved the world The Son of Man [17] For God did not send the Son into the world'
    )
  })

  it('preserves bracket-format lines and heading lines mixed in one passage', () => {
    const raw =
      '[1] In the beginning God created.\nThe Creation of Heaven and Earth\n[2] And the earth was'
    expect(formatApiBiblePassageText(raw)).toBe(
      '[1] In the beginning God created. The Creation of Heaven and Earth [2] And the earth was'
    )
  })

  it('does not strip publisher or verse content from bracket lines', () => {
    const raw =
      '[17] Cult Prostitution Forbidden. No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    expect(formatApiBiblePassageText(raw)).toBe(raw.replace(/\s+/g, ' ').trim())
  })

  it('strips hash characters leaked around em/en dashes (API.Bible plain text)', () => {
    const withHashes = '[4] your rod and your staff #\u2014 #they comfort me.'
    expect(formatApiBiblePassageText(withHashes)).toBe(
      '[4] your rod and your staff \u2014they comfort me.'
    )
  })

  it('normalizeScriptureCachedText matches formatter output for bracket passages', () => {
    const withHashes = '[4] your rod and your staff #\u2014 #they comfort me.'
    expect(normalizeScriptureCachedText(withHashes)).toBe(formatApiBiblePassageText(withHashes))
  })

  it('preserves ESV paragraph breaks when normalizing cached text', () => {
    const withParagraphs =
      '[1] Paul, a servant.\n\n  Grace to you and peace.\n\n  [2] which he promised'
    expect(normalizeScriptureCachedText(withParagraphs)).toBe(
      '[1] Paul, a servant.\n\nGrace to you and peace.\n\n[2] which he promised'
    )
  })

  it('parses stringified API.Bible JSON passage trees', () => {
    expect(formatApiBiblePassageText(JSON.stringify(romansOneParaFixture))).toBe(
      '[1] Paul, a servant. [2] Promised afore.\n\n[8] First, I thank my God.'
    )
  })
})
