import {
  formatScriptureChapterHtml,
  formatScripturePassageHtml,
  isolatePsalm119AcrosticHeadings,
  verseSupHtml,
  wrapScriptureSelahHtml,
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

describe('isolatePsalm119AcrosticHeadings', () => {
  it('breaks inline acrostic titles onto their own line before the next verse', () => {
    const text =
      'Daleth\n\n[25] My soul clings. [32] I run in the way of your commandments; enlarge my heart! He [33] Teach me, O LORD. [40] Behold, I long for your precepts; in your righteousness give me life! Waw [41] Let your steadfast love come'
  const isolated = isolatePsalm119AcrosticHeadings(text)
    expect(isolated).toContain('enlarge my heart!\n\nHe\n\n[33]')
    expect(isolated).toContain('give me life!\n\nWaw\n\n[41]')
    expect(isolated).toContain('Daleth\n\n[25]')
  })

  it('renders acrostic titles as separate paragraphs in passage HTML', () => {
    const text =
      '[32] enlarge my heart! He [33] Teach me, O LORD, the way of your statutes!'
    const html = formatScripturePassageHtml(text, { showVerseNumbers: true })
    expect(html).toContain('enlarge my heart!</p><p>He</p><p>')
    expect(html).toContain('>33</sup> Teach me')
  })
})

describe('wrapScriptureSelahHtml', () => {
  it('wraps Selah and starts the next verse after a break', () => {
    const html = wrapScriptureSelahHtml(
      'though the mountains tremble at its swelling. Selah <sup>4</sup> There is a river'
    )
    expect(html).toContain('<span class="scripture-pause-mark">Selah</span>')
    expect(html).toContain('<span class="scripture-pause-break" aria-hidden="true"></span>')
    expect(html).toContain('</span> <sup>4</sup> There is a river')
  })

  it('wraps Higgaion. Selah as one mark', () => {
    const html = wrapScriptureSelahHtml('the work of their own hands. Higgaion. Selah')
    expect(html).toContain('<span class="scripture-pause-mark">Higgaion. Selah</span>')
    expect(html).not.toMatch(/Higgaion\. <span class="scripture-pause-mark">Selah/)
  })

  it('wraps NLT Interlude the same way', () => {
    const html = wrapScriptureSelahHtml('at its swelling. Interlude <sup>4</sup> There is a river')
    expect(html).toContain('<span class="scripture-pause-mark">Interlude</span>')
  })

  it('keeps a trailing period with Selah', () => {
    const html = wrapScriptureSelahHtml('our fortress. Selah.')
    expect(html).toContain('<span class="scripture-pause-mark">Selah.</span>')
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

  it('places Selah after the verse and before the next verse number', () => {
    const html = formatScripturePassageHtml(
      '[3] though the mountains tremble at its swelling. Selah [4] There is a river whose streams make glad the city of God.',
      { showVerseNumbers: true }
    )
    expect(html).toContain('swelling. <span class="scripture-pause-mark">Selah</span>')
    expect(html).toContain('scripture-pause-break')
    expect(html).toMatch(/scripture-pause-break[^>]*>[\s\S]*<sup class="text-blue-600 font-medium">4<\/sup>/)
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

  it('keeps Selah inside a saved highlight that ends on that verse', () => {
    const psalmText =
      '[3] though the mountains tremble at its swelling. Selah [4] There is a river whose streams make glad the city of God.'
    const html = formatScriptureChapterHtml(psalmText, {
      showVerseNumbers: true,
      highlightVerses: [],
      savedHighlights: [{ id: 'h1', verseStart: 3, verseEnd: 3, colorId: 'blue' }],
    })
    expect(html).toMatch(
      /<mark[^>]*data-scripture-highlight-id="h1"[^>]*>[\s\S]*scripture-pause-mark">Selah<\/span>/
    )
    expect(html).toContain('<sup class="text-blue-600 font-medium">4</sup>')
  })
})
