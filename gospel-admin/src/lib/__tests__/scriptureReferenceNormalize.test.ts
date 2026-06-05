import {
  auditScriptureReferencesInText,
  expandCommaBetweenDistinctScriptureRefs,
  expandSameChapterCommaVerseOrSeparate,
  expandSemicolonInheritedBookRefs,
  isGospelCanonicalScriptureRef,
  normalizeGospelPresentationData,
  normalizeScriptureDisplay,
  normalizeScriptureReferenceString,
  normalizeScriptureReferencesInHtml,
  preprocessScriptureHtmlForNormalize,
  scanCanonicalScriptureSpansInPlainText,
} from '@/lib/scriptureReferenceNormalize'
import type { GospelPresentationData } from '@/lib/types'

describe('scriptureReferenceNormalize', () => {
  it('normalizeScriptureReferenceString expands ThML-style abbreviations', () => {
    expect(normalizeScriptureReferenceString('Rom 8:28')).toBe('Romans 8:28')
    expect(normalizeScriptureReferenceString('Rom. 8:28')).toBe('Romans 8:28')
    expect(normalizeScriptureReferenceString('1 Cor. 13:4')).toBe('1 Corinthians 13:4')
    expect(normalizeScriptureReferenceString('I Cor. 1:28')).toBe('1 Corinthians 1:28')
    expect(normalizeScriptureReferenceString('Matt. 19:14')).toBe('Matthew 19:14')
    expect(normalizeScriptureReferenceString('Matt 26:39')).toBe('Matthew 26:39')
    expect(normalizeScriptureReferenceString('Phil. 2:6')).toBe('Philippians 2:6')
    expect(normalizeScriptureReferenceString('Philip. 2:8')).toBe('Philippians 2:8')
    expect(normalizeScriptureReferenceString('I Pet. 2:23')).toBe('1 Peter 2:23')
    expect(normalizeScriptureReferenceString('Numb. 24:17')).toBe('Numbers 24:17')
    expect(normalizeScriptureReferenceString('Cant. 8:1')).toBe('Song of Songs 8:1')
    expect(normalizeScriptureReferenceString('Deut. 32:4')).toBe('Deuteronomy 32:4')
    expect(normalizeScriptureReferenceString('Exod. 20:2')).toBe('Exodus 20:2')
    expect(normalizeScriptureReferenceString('Psal. 115:3')).toBe('Psalms 115:3')
    expect(normalizeScriptureReferenceString('2 Chron. 18:22')).toBe('2 Chronicles 18:22')
    expect(normalizeScriptureReferenceString('Psal. 147:19-20')).toBe('Psalms 147:19-20')
    expect(normalizeScriptureReferenceString('Phil.3:14')).toBe('Philippians 3:14')
    expect(normalizeScriptureReferenceString('2 Cor.5:21')).toBe('2 Corinthians 5:21')
    expect(normalizeScriptureReferenceString('Colos. 2:12-13')).toBe('Colossians 2:12-13')
    expect(normalizeScriptureReferenceString('Eccles. 2:16')).toBe('Ecclesiastes 2:16')
    expect(normalizeScriptureReferenceString('Hag. 1:9')).toBe('Haggai 1:9')
    expect(normalizeScriptureReferenceString('Psa. 23:4')).toBe('Psalms 23:4')
  })

  it('normalizeScriptureDisplay inserts space after period before chapter digit', () => {
    expect(normalizeScriptureDisplay('Phil.3:14')).toBe('Phil. 3:14')
  })

  it('normalizeScriptureDisplay collapses space around colon', () => {
    expect(normalizeScriptureDisplay('John 5: 28,29')).toBe('John 5:28,29')
  })

  it('normalizeScriptureReferenceString handles space after colon and comma verse lists', () => {
    expect(normalizeScriptureReferenceString('John 5: 28,29')).toBe('John 5:28-29')
    expect(normalizeScriptureReferenceString('Revelation 20: 11-14')).toBe('Revelation 20:11-14')
    expect(isGospelCanonicalScriptureRef('John 5: 28,29')).toBe(true)
  })

  it('scanCanonicalScriptureSpansInPlainText keeps original indices for inherited refs', () => {
    const text = 'Revelation 1; 4:4'
    const spans = scanCanonicalScriptureSpansInPlainText(text)
    expect(spans).toEqual([
      { start: 0, end: 12, raw: 'Revelation 1', cleanRef: 'Revelation 1' },
      { start: 12, end: 17, raw: '; 4:4', cleanRef: 'Revelation 4:4' },
    ])
  })

  it('scanCanonicalScriptureSpansInPlainText inherits book number on ; Thessalonians', () => {
    const spans = scanCanonicalScriptureSpansInPlainText('1 Thessalonians 4:16; Thessalonians 4:16-17')
    expect(spans.map((s) => s.cleanRef)).toEqual(['1 Thessalonians 4:16', '1 Thessalonians 4:16-17'])
  })

  it('scanCanonicalScriptureSpansInPlainText includes orphan abbrev in span raw', () => {
    const spans = scanCanonicalScriptureSpansInPlainText('R Revelation 4:4')
    expect(spans).toEqual([
      { start: 0, end: 'R Revelation 4:4'.length, raw: 'R Revelation 4:4', cleanRef: 'Revelation 4:4' },
    ])
  })

  it('expandCommaBetweenDistinctScriptureRefs splits CCEL chained scripRef commas', () => {
    expect(
      expandCommaBetweenDistinctScriptureRefs('1 Corinthians 1:20,1 Corinthians 1:21')
    ).toBe('1 Corinthians 1:20; 1 Corinthians 1:21')
    expect(expandCommaBetweenDistinctScriptureRefs('Romans 7:18,24')).toBe('Romans 7:18,24')
  })

  it('expandSameChapterCommaVerseOrSeparate ranges or semicolons verse tails', () => {
    expect(expandSameChapterCommaVerseOrSeparate('Colossians 2:14,15')).toBe('Colossians 2:14-15')
    expect(expandSameChapterCommaVerseOrSeparate('2 Peter 2:4,9')).toBe('2 Peter 2:4; 2 Peter 2:9')
  })

  it('expandSemicolonInheritedBookRefs reuses book for bare chapter:verse after semicolon', () => {
    expect(expandSemicolonInheritedBookRefs('Psalms 5:4 ; 50:1-3 ; Malachi 3:2')).toBe(
      'Psalms 5:4 ; Psalms 50:1-3 ; Malachi 3:2'
    )
    expect(expandSemicolonInheritedBookRefs('Matthew 3:12 ; 18:30; 24:30; Malachi 4:1')).toBe(
      'Matthew 3:12 ; Matthew 18:30; Matthew 24:30; Malachi 4:1'
    )
    expect(
      expandSemicolonInheritedBookRefs('1 Thessalonians 4:16; Thessalonians 4:16-17')
    ).toBe('1 Thessalonians 4:16; 1 Thessalonians 4:16-17')
  })

  it('preprocessScriptureHtmlForNormalize fixes Isaiah 1 Thessalonians typo', () => {
    expect(
      preprocessScriptureHtmlForNormalize('<p>Isaiah 6:2; Isaiah 1 Thessalonians 4:16-17</p>')
    ).toBe('<p>Isaiah 6:2; 1 Thessalonians 4:16-17</p>')
  })

  it('normalizeScriptureReferencesInHtml expands semicolon chapter:verse lists', () => {
    const html = '<p>Psalms 5:4 ; 50:1-3 end.</p>'
    expect(normalizeScriptureReferencesInHtml(html)).toBe('<p>Psalms 5:4 ; Psalms 50:1-3 end.</p>')
  })

  it('auditScriptureReferencesInText flags unresolved abbreviations', () => {
    const issues = auditScriptureReferencesInText('<p>See Foo. 9:9 here.</p>', 'content')
    expect(issues.some((i) => i.reason === 'unresolved_abbrev')).toBe(true)
  })

  it('auditScriptureReferencesInText skips calendar dates and CHAPTER headings', () => {
    const prose =
      'Worcester, December 4, 1655 and 12 March 1829; signed 15 April 1656.'
    expect(auditScriptureReferencesInText(prose, 'content')).toEqual([])
    expect(auditScriptureReferencesInText('CHAPTER 1', 'title')).toEqual([])
    expect(auditScriptureReferencesInText('SECTION 1', 'content')).toEqual([])
    expect(auditScriptureReferencesInText('PART I', 'content')).toEqual([])
    expect(
      auditScriptureReferencesInText('After 4,000 years the nations appeared ignorant.', 'content')
    ).toEqual([])
    expect(auditScriptureReferencesInText('See Ver. 19 and Corol. 2.', 'content')).toEqual([])
    expect(auditScriptureReferencesInText('Chap. 5:1-2 in the margin.', 'content')).toEqual([])
    expect(
      auditScriptureReferencesInText('<p>1 Peter 2:4, 7 and Rom 8:28.</p>', 'content')
    ).toEqual([])
  })

  it('leaves unrecognized references unchanged', () => {
    expect(normalizeScriptureReferenceString('Not A Verse 99:99')).toBe('Not A Verse 99:99')
  })

  it('normalizeScriptureReferencesInHtml replaces contiguous abbrev refs in HTML', () => {
    const html = '<p>See Rom 8:28 and John 3:16.</p>'
    expect(normalizeScriptureReferencesInHtml(html)).toBe('<p>See Romans 8:28 and John 3:16.</p>')
  })

  it('normalizeScriptureReferencesInHtml handles period after abbreviated book', () => {
    const html = '<p>See Prov. 30:4 and I Cor. 1:28.</p>'
    expect(normalizeScriptureReferencesInHtml(html)).toBe(
      '<p>See Proverbs 30:4 and 1 Corinthians 1:28.</p>'
    )
  })

  it('collapses same-chapter consecutive comma verses to a hyphen range', () => {
    expect(normalizeScriptureReferenceString('Col. 2:14,15')).toBe('Colossians 2:14-15')
    expect(normalizeScriptureReferenceString('2 Pet. 1:16,17')).toBe('2 Peter 1:16-17')
    expect(normalizeScriptureReferenceString('2 Pet. 1:16, 17')).toBe('2 Peter 1:16-17')
    expect(normalizeScriptureReferenceString('2 Peter 1:16,17')).toBe('2 Peter 1:16-17')
    expect(normalizeScriptureReferenceString('Rev. 22:16,17')).toBe('Revelation 22:16-17')
    expect(isGospelCanonicalScriptureRef('2 Peter 1:16-17')).toBe(true)
  })

  it('leaves non-contiguous comma verse lists unchanged', () => {
    expect(normalizeScriptureReferenceString('Acts 2:23,36,37,41')).toBe('Acts 2:23,36,37,41')
  })

  it('strips following-verse markers (f./ff.) for canonical refs and HTML', () => {
    expect(normalizeScriptureReferenceString('Colossians 1:16f.')).toBe('Colossians 1:16')
    expect(normalizeScriptureReferenceString('Col. 1:16f.')).toBe('Colossians 1:16')
    expect(normalizeScriptureReferenceString('Matthew 21:4f')).toBe('Matthew 21:4')
    const html = '<p>will. Colossians 1:16f. "<i>By him</i></p>'
    expect(normalizeScriptureReferencesInHtml(html)).toBe('<p>will. Colossians 1:16 "<i>By him</i></p>')
  })

  it('isGospelCanonicalScriptureRef accepts refs that normalize to canonical books', () => {
    expect(isGospelCanonicalScriptureRef('Romans 8:28')).toBe(true)
    expect(isGospelCanonicalScriptureRef('Rom 8:28')).toBe(true)
    expect(isGospelCanonicalScriptureRef('1 Corinthians 15')).toBe(true)
    expect(isGospelCanonicalScriptureRef('Jude 15')).toBe(true)
    expect(isGospelCanonicalScriptureRef('Not A Book 1:1')).toBe(false)
  })

  it('normalizeScriptureReferenceString canonicalizes chapter-only refs', () => {
    expect(normalizeScriptureReferenceString('1 Cor. 15')).toBe('1 Corinthians 15')
    expect(normalizeScriptureReferenceString('Jude 15')).toBe('Jude 15')
  })

  it('normalizeGospelPresentationData walks subsection content', () => {
    const data: GospelPresentationData = [
      {
        section: 'je01',
        title: 'Sermon',
        subsections: [
          {
            title: 'Intro',
            content: '<p>Text Rom 8:28 end.</p>',
          },
        ],
      },
    ]
    const { data: out, changed, replacements } = normalizeGospelPresentationData(data)
    expect(changed).toBe(true)
    expect(out[0].subsections[0].content).toContain('Romans 8:28')
    expect(replacements.some((r) => r.from.includes('Rom 8:28'))).toBe(true)
  })
})
