import {
  applySecularTermMapToGospelData,
  buildSectionAnchorByTitle,
  buildSecularTermMapSectionHtml,
  lookupSecularTermMap,
  normalizeSecularTerm,
  parseSecularTermsInput,
  normalizeSecularTermMapForSave,
  parseSecularTermMapFile,
  validateSecularTermMapAgainstSections,
  type SecularTermMapFile,
} from '@/lib/biblicalCounseling/secularTermMap'
import type { GospelSection } from '@/lib/types'

const sampleMap: SecularTermMapFile = {
  pinnedSectionTitle: 'Find your topic (secular terms)',
  introHtml: '<p>Intro</p>',
  mappings: [
    {
      secularTerms: ['self-esteem', 'self esteem'],
      biblicalTopic: 'Pride and humility',
    },
    {
      secularTerms: ['panic attack'],
      biblicalTopic: 'Anxiety and Worry',
    },
  ],
}

describe('secularTermMap', () => {
  it('normalizeSecularTerm collapses whitespace and lowercases', () => {
    expect(normalizeSecularTerm('  Self   Esteem  ')).toBe('self esteem')
  })

  it('lookupSecularTermMap matches exact and substring terms', () => {
    expect(lookupSecularTermMap('se', sampleMap)).toBeNull()
    expect(lookupSecularTermMap('self', sampleMap)?.biblicalTopic).toBe('Pride and humility')
    expect(lookupSecularTermMap('self-esteem', sampleMap)?.biblicalTopic).toBe(
      'Pride and humility'
    )
    expect(lookupSecularTermMap('esteem', sampleMap)?.matchedSecularTerm).toBe('self-esteem')
    expect(lookupSecularTermMap('panic', sampleMap)?.biblicalTopic).toBe('Anxiety and Worry')
  })

  it('buildSecularTermMapSectionHtml links topics to section anchors', () => {
    const anchors = new Map([
      ['pride and humility', 'section-5'],
      ['anxiety and worry', 'section-2'],
    ])
    const html = buildSecularTermMapSectionHtml(sampleMap, anchors)
    expect(html).toContain('self-esteem')
    expect(html).toContain('href="#section-5"')
    expect(html).toContain('Pride and humility')
    expect(html).toContain('class="secular-term-map-terms-cell"')
    expect(html).toContain('class="secular-term-map-table-wrap"')
    expect(html).toContain('class="secular-term-map-topic">→&nbsp;')
  })

  it('validateSecularTermMapAgainstSections flags unknown topics', () => {
    const sections: GospelSection[] = [
      { section: '2', title: 'Pride and humility', subsections: [] },
    ]
    const issues = validateSecularTermMapAgainstSections(sampleMap, sections)
    expect(issues).toEqual([{ biblicalTopic: 'Anxiety and Worry', kind: 'unknown_topic' }])
  })

  it('applySecularTermMapToGospelData pins mapping section first and renumbers', () => {
    const gospelData: GospelSection[] = [
      { section: '1', title: 'Zebra topic', subsections: [] },
      { section: '2', title: 'Pride and humility', subsections: [] },
      { section: '3', title: 'Anxiety and Worry', subsections: [] },
    ]
    applySecularTermMapToGospelData(gospelData, sampleMap)
    expect(gospelData[0]?.title).toBe('Find your topic (secular terms)')
    expect(gospelData[0]?.section).toBe('1')
    expect(gospelData[1]?.title).toBe('Anxiety and Worry')
    expect(gospelData.map((s) => s.section)).toEqual(['1', '2', '3', '4'])
    expect(gospelData[0]?.subsections[0]?.content).toContain('secular-term-map-table')
  })

  it('parseSecularTermsInput splits comma and line separated terms', () => {
    expect(parseSecularTermsInput('a, b\nc')).toEqual(['a', 'b', 'c'])
  })

  it('normalizeSecularTermMapForSave dedupes secular terms', () => {
    const normalized = normalizeSecularTermMapForSave({
      pinnedSectionTitle: ' Map ',
      introHtml: ' intro ',
      mappings: [
        {
          biblicalTopic: ' Pride ',
          secularTerms: ['Self-Esteem', 'self-esteem', ''],
        },
      ],
    })
    expect(normalized.mappings).toHaveLength(1)
    expect(normalized.mappings[0]?.secularTerms).toEqual(['Self-Esteem'])
    expect(normalized.pinnedSectionTitle).toBe('Map')
  })

  it('parseSecularTermMapFile rejects invalid shape', () => {
    expect(() => parseSecularTermMapFile({})).toThrow(/Invalid/)
  })

  it('buildSectionAnchorByTitle is case-insensitive', () => {
    const sections: GospelSection[] = [
      { section: '2', title: 'Pride and humility', subsections: [] },
    ]
    expect(buildSectionAnchorByTitle(sections).get('pride and humility')).toBe('section-2')
  })
})
