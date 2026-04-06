import { buildBibleTranslationTourPopoverDescription } from '@/lib/profileHelpTours'

describe('buildBibleTranslationTourPopoverDescription', () => {
  it('lists each translation name as a list item', () => {
    const html = buildBibleTranslationTourPopoverDescription([
      { translation_name: 'ESV (English Standard Version)' },
      { translation_name: 'KJV (King James Version)' },
    ])
    expect(html).toContain('<li><strong>ESV (English Standard Version)</strong></li>')
    expect(html).toContain('<li><strong>KJV (King James Version)</strong></li>')
    expect(html).toContain('Translations available')
  })

  it('escapes HTML in translation names', () => {
    const html = buildBibleTranslationTourPopoverDescription([
      { translation_name: 'Test <script>' },
    ])
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('falls back to ESV when the list is empty', () => {
    const html = buildBibleTranslationTourPopoverDescription([])
    expect(html).toContain('ESV (English Standard Version)')
  })
})
