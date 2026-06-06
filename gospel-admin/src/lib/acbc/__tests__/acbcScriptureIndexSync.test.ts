import {
  extractScriptureRefsFromAcbcArticleHtml,
  extractScriptureRefsFromAcbcText,
  mergeAcbcArticleScriptureIndexMaps,
  parseAcbcResourceCardScriptureRefsFromHtml,
  parseAcbcScriptureIndexArticleBooksFromBookHtml,
  parseAcbcScriptureIndexBookSlugsFromHtml,
  mergeScriptureReferenceLists,
  scriptureReferenceMatchesAcbcBooks,
  scriptureReferencesForAcbcExternalLinks,
  sortScriptureReferenceStrings,
} from '@/lib/acbc/acbcScriptureIndexSync'
import { loadCuratedAcbcScriptureRefsBySection } from '@/lib/acbc/acbcCuratedScriptureRefs'
import path from 'path'
import { normalizeAcbcResourceUrl } from '@/lib/acbc/externalResourceLinksSync'

describe('acbcScriptureIndexSync', () => {
  it('parses canon book slugs from scripture index landing page', () => {
    const html = `
      <a href="/resource-library/scripture-index/philippians">Philippians</a>
      <a href="/resource-library/scripture-index/individual-booklets-62">1 John</a>
      <a href="/resource-library/scripture-index/psalms">Psalms</a>
    `
    const books = parseAcbcScriptureIndexBookSlugsFromHtml(html)
    expect(books.map((b) => b.slug)).toEqual(['philippians', 'psalms'])
  })

  it('extracts direct and embedded scripture refs from ACBC subtitles', () => {
    expect(extractScriptureRefsFromAcbcText('Philippians 4:6-7')).toEqual(['Philippians 4:6-7'])
    expect(extractScriptureRefsFromAcbcText('Lessons from Matthew 6')).toEqual(['Matthew 6'])
    expect(extractScriptureRefsFromAcbcText('Reminders from Psalm 100 amidst trials')).toEqual([
      'Psalms 100',
    ])
    expect(extractScriptureRefsFromAcbcText('Truth in Love 181')).toEqual([])
  })

  it('parses scripture refs from resource cards by article URL', () => {
    const url =
      'https://biblicalcounseling.com/resource-library/articles/be-anxious-for-nothing/'
    const html = `
      <div class="card card-small articles">
        <a href="${url}" class="overlink"></a>
        <div class="card-content">
          <h3><a href="${url}">Be Anxious for Nothing</a></h3>
          <h4 class="subtitle text-large">Philippians 4:6-7</h4>
        </div>
      </div>
    `
    const map = parseAcbcResourceCardScriptureRefsFromHtml(html)
    expect(map.get(normalizeAcbcResourceUrl(url))).toEqual(['Philippians 4:6-7'])
  })

  it('builds section scripture cards from linked articles', () => {
    const anxiousUrl = normalizeAcbcResourceUrl(
      'https://biblicalcounseling.com/resource-library/articles/be-anxious-for-nothing/'
    )
    const psalmUrl = normalizeAcbcResourceUrl(
      'https://biblicalcounseling.com/resource-library/articles/letting-psalm-46-guide-our-thinking/'
    )
    const index = mergeAcbcArticleScriptureIndexMaps(
      new Map([[anxiousUrl, ['Philippians 4:6-7']]]),
      new Map([[psalmUrl, ['Psalms 46']]])
    )

    const refs = scriptureReferencesForAcbcExternalLinks(
      [
        { label: 'Be Anxious for Nothing', url: anxiousUrl },
        { label: 'Letting Psalm 46 Guide our Thinking', url: psalmUrl },
      ],
      index
    )

    expect(refs.map((r) => r.reference)).toEqual(['Psalms 46', 'Philippians 4:6-7'])
  })

  it('sorts references in canon order', () => {
    expect(
      sortScriptureReferenceStrings(['Romans 8:28', 'Matthew 6:25-34', 'Philippians 4:6-7'])
    ).toEqual(['Matthew 6:25-34', 'Romans 8:28', 'Philippians 4:6-7'])
  })

  it('mergeScriptureReferenceLists keeps curated refs when ACBC index has few matches', () => {
    const curated = [
      { reference: 'Matthew 6:25-34' },
      { reference: 'Philippians 4:6-7' },
      { reference: '1 Peter 5:7' },
    ]
    const acbcDerived = [{ reference: 'Psalms 46' }]
    const merged = mergeScriptureReferenceLists(curated, acbcDerived)
    expect(merged.map((r) => r.reference)).toEqual([
      'Psalms 46',
      'Matthew 6:25-34',
      'Philippians 4:6-7',
      '1 Peter 5:7',
    ])
  })

  it('maps article URLs to scripture-index book pages', () => {
    const url =
      'https://biblicalcounseling.com/resource-library/articles/suffering-school-of-sanctification/'
    const html = `
      <a href="${url}" class="overlink"></a>
      <h3><a href="${url}">Suffering is God’s School of Sanctification</a></h3>
    `
    const map = parseAcbcScriptureIndexArticleBooksFromBookHtml(html, 'Romans')
    expect(map.get(normalizeAcbcResourceUrl(url))).toEqual(['Romans'])
  })

  it('extracts only references for the index book from article HTML', () => {
    const html = `
      <h1>Discipline and Hope</h1>
      <article>
        <p>He gave Him up for us (Romans 8:32) and conforms us (Romans 8:29).</p>
        <p>See also Matthew 7:11 and Philippians 4:6-7.</p>
      </article>
    `
    const refs = extractScriptureRefsFromAcbcArticleHtml(html, ['Romans'])
    expect(refs).toEqual(['Romans 8:29', 'Romans 8:32'])
    expect(scriptureReferenceMatchesAcbcBooks('Psalms 23:1', ['Romans'])).toBe(false)
    expect(scriptureReferenceMatchesAcbcBooks('Psalm 23:1', ['Psalms'])).toBe(true)
  })

  it('loads curated key passages for Anxiety and Worry from admin backup', () => {
    const backupPath = path.join(
      process.cwd(),
      'data/templates/biblical-counseling-topics-verses.admin-backup.json'
    )
    const curated = loadCuratedAcbcScriptureRefsBySection(backupPath)
    const anxiety = curated.get('anxiety and worry') ?? []
    expect(anxiety.length).toBeGreaterThan(3)
    expect(anxiety.some((r) => r.reference.replace(/\u2013/g, '-') === 'Philippians 4:6-7')).toBe(
      true
    )
  })

  it('loads curated Election key passages from acbc-election-scripture-refs.json', () => {
    const curated = loadCuratedAcbcScriptureRefsBySection()
    const election = curated.get('election') ?? []
    expect(election.map((r) => r.reference)).toEqual(
      expect.arrayContaining(['John 6:37', 'Romans 9:15-16', 'Ephesians 1:3-6'])
    )
    expect(election.length).toBe(7)
  })
})
