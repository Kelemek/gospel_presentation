import { formatApiBiblePassageText, normalizeScriptureCachedText } from '@/lib/api-bible-format'

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
})
