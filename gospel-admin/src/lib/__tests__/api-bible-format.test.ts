import { formatApiBiblePassageText } from '@/lib/api-bible-format'

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
})
