import {
  formatScriptureChapterHtml,
  formatScripturePassageHtml,
  verseSupHtml,
} from '@/lib/scripturePassageHtml'

describe('verseSupHtml', () => {
  it('renders visible blue sup when showVerseNumbers is true', () => {
    expect(verseSupHtml(16, true)).toBe('<sup class="text-blue-600 font-medium">16</sup>')
  })

  it('renders clickable verse sup when requested', () => {
    expect(verseSupHtml(16, true, true)).toContain('data-scripture-verse="16"')
    expect(verseSupHtml(16, true, true)).toContain('scripture-verse-number')
    expect(verseSupHtml(16, true, true)).toContain('>16</sup>')
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
    expect(html).toContain('</p><p>')
    expect(html).toMatch(/^<p>[\s\S]*<\/p>$/)
    expect(html).toContain('<sup class="text-blue-600 font-medium">2</sup>')
  })

  it('hides verse numbers when showVerseNumbers is false', () => {
    const html = formatScripturePassageHtml('[16] For God so loved', { showVerseNumbers: false })
    expect(html).toContain('<sup class="hidden" aria-hidden="true">16</sup>')
    expect(html).not.toContain('text-blue-600')
  })

  it('wraps passage in saved highlight mark', () => {
    const html = formatScripturePassageHtml('[16] For God so loved', {
      showVerseNumbers: true,
      savedHighlight: { id: 'h1', colorId: 'red' },
    })
    expect(html).toContain('data-scripture-highlight-id="h1"')
    expect(html).toContain('scripture-highlight-mark-red')
  })

  it('wraps passage in yellow saved highlight mark', () => {
    const html = formatScripturePassageHtml('[16] For God so loved', {
      showVerseNumbers: true,
      savedHighlight: { id: 'h2', colorId: 'yellow' },
    })
    expect(html).toContain('scripture-highlight-mark-yellow')
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

  it('marks verse numbers clickable when clickableVerseNumbers is true', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: true,
      highlightVerses: [],
      clickableVerseNumbers: true,
    })
    expect(html).toContain('data-scripture-verse="16"')
  })

  it('still highlights when verse numbers are hidden', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: false,
      highlightVerses: [16],
    })
    expect(html).toContain('id="verse-16"')
    expect(html).toContain('<sup class="hidden" aria-hidden="true">16</sup>')
  })

  it('applies saved highlight marks in chapter view', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: true,
      highlightVerses: [],
      savedHighlights: [{ id: 'h1', verseStart: 16, verseEnd: 16, colorId: 'blue' }],
    })
    expect(html).toContain('data-scripture-highlight-id="h1"')
    expect(html).toContain('scripture-highlight-mark-blue')
    expect(html).toContain('For God so loved the world.')
  })

  it('applies multiple saved highlight marks in chapter view', () => {
    const multiVerseChapter =
      '[1] Verse one. [2] Verse two. [3] Verse three. [4] Verse four.'
    const html = formatScriptureChapterHtml(multiVerseChapter, {
      showVerseNumbers: true,
      highlightVerses: [],
      savedHighlights: [
        { id: 'h1', verseStart: 2, verseEnd: 2, colorId: 'red' },
        { id: 'h2', verseStart: 3, verseEnd: 3, colorId: 'blue' },
      ],
    })
    expect(html).toContain('data-scripture-highlight-id="h1"')
    expect(html).toContain('data-scripture-highlight-id="h2"')
    expect(html).toContain('Verse two.')
    expect(html).toContain('Verse three.')
    expect(html.indexOf('Verse one.')).toBeLessThan(html.indexOf('<mark'))
    expect(html.lastIndexOf('Verse four.')).toBeGreaterThan(html.lastIndexOf('</mark>'))
  })

  it('does not mark other verses when saved highlight range is clipped to one verse', () => {
    const html = formatScriptureChapterHtml(chapterText, {
      showVerseNumbers: true,
      highlightVerses: [16],
      savedHighlights: [{ id: 'h1', verseStart: 16, verseEnd: 16, colorId: 'red' }],
    })
    expect(html).toContain('data-scripture-highlight-id="h1"')
    expect(html).not.toMatch(/<mark[^>]*>[\s\S]*Verse fifteen/)
  })
})
