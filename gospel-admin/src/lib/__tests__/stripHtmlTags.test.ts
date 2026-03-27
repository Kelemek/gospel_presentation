import { stripHtmlTags } from '../stripHtmlTags'

describe('stripHtmlTags', () => {
  it('returns plain text from HTML', () => {
    expect(stripHtmlTags('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('handles empty and non-string', () => {
    expect(stripHtmlTags('')).toBe('')
    expect(stripHtmlTags(null as unknown as string)).toBe('')
  })
})
