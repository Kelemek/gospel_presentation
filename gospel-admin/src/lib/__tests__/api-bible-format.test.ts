import { formatApiBiblePassageText, normalizeApiBibleStoredText } from '@/lib/api-bible-format'

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

  it('drops section heading lines between verse-numbered lines', () => {
    const raw =
      '16 For God so loved the world\nThe Son of Man\n17 For God did not send the Son into the world'
    expect(formatApiBiblePassageText(raw)).toBe(
      '[16] For God so loved the world [17] For God did not send the Son into the world'
    )
  })

  it('drops bracket-format section title lines between verses', () => {
    const raw =
      '[1] In the beginning God created.\nThe Creation of Heaven and Earth\n[2] And the earth was'
    expect(formatApiBiblePassageText(raw)).toBe(
      '[1] In the beginning God created. [2] And the earth was'
    )
  })

  it('drops inline CSB-style section title before verse (e.g. Deuteronomy 23:17)', () => {
    const raw =
      '[17] Cult Prostitution Forbidden. No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    expect(formatApiBiblePassageText(raw)).toBe(
      '[17] No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    )
  })

  it('drops CSB inline title + typographic quote + trailing passage ref (API.Bible text shape)', () => {
    const raw =
      '[17] Cult Prostitution Forbidden \u201cNo Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute. Deuteronomy 23:17'
    expect(formatApiBiblePassageText(raw)).toBe(
      '[17] No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    )
  })

  it('normalizeApiBibleStoredText runs formatter for csb only', () => {
    const raw =
      '[17] Cult Prostitution Forbidden \u201cNo Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    expect(normalizeApiBibleStoredText('csb', raw)).toBe(
      '[17] No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    )
    expect(normalizeApiBibleStoredText('esv', raw)).toBe(raw)
  })

  it('recovers verse when multi-line passage has no `[n]` lines (heading + quote + citation)', () => {
    const raw = `Cult Prostitution Forbidden
"No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.
Deuteronomy 23:17`
    expect(formatApiBiblePassageText(raw)).toBe(
      'No Israelite woman is to be a cult prostitute, and no Israelite man is to be a cult prostitute.'
    )
  })
})
