import {
  formatScriptureChapterHtml,
  formatScripturePassageHtml,
  verseSupHtml,
} from '@/lib/scripturePassageHtml'

describe('verseSupHtml', () => {
  it('renders visible blue sup when showVerseNumbers is true', () => {
    expect(verseSupHtml(16, true)).toBe('<sup class="text-blue-600 font-medium">16</sup>')
  })

  it('renders hidden sup when showVerseNumbers is false', () => {
    expect(verseSupHtml(16, false)).toBe('<sup class="hidden" aria-hidden="true">16</sup>')
  })
})

describe('formatScripturePassageHtml', () => {
  it('converts verse markers and paragraph breaks', () => {
    const html = formatScripturePassageHtml('[1] First verse\n\n[2] Second verse', {
      showVerseNumbers: true,
    })
    expect(html).toContain('<sup class="text-blue-600 font-medium">1</sup>')
    expect(html).toContain('</p><p class="mt-4">')
    expect(html).toContain('<sup class="text-blue-600 font-medium">2</sup>')
  })

  it('hides verse numbers when showVerseNumbers is false', () => {
    const html = formatScripturePassageHtml('[16] For God so loved', { showVerseNumbers: false })
    expect(html).toContain('<sup class="hidden" aria-hidden="true">16</sup>')
    expect(html).not.toContain('text-blue-600')
  })
})

describe('formatScriptureChapterHtml', () => {
  const chapterText = '[15] Verse fifteen. [16] For God so loved the world. [17] That whoever believes.'

  it('wraps a single verse highlight', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: true,
      highlightVerses: [16],
    })
    expect(html).toContain('id="verse-16"')
    expect(html).toContain('For God so loved the world.')
  })

  it('wraps a verse range highlight', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: true,
      highlightVerses: [16, 17],
    })
    expect(html).toContain('id="verse-range-16-17"')
    expect(html).toContain('For God so loved the world.')
    expect(html).toContain('That whoever believes.')
  })

  it('formats chapter text without highlight when highlightVerses is empty', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: true,
      highlightVerses: [],
    })
    expect(html).not.toContain('id="verse-16"')
    expect(html).toContain('<sup class="text-blue-600 font-medium">16</sup>')
  })

  it('still highlights when verse numbers are hidden', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: false,
      highlightVerses: [16],
    })
    expect(html).toContain('id="verse-16"')
    expect(html).toContain('<sup class="hidden" aria-hidden="true">16</sup>')
  })
})
