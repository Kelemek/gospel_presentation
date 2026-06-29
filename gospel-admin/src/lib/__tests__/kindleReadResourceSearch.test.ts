import {
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
} from '@/lib/biblicalCounseling/biblicalCounselingReference'
import type { SecularTermMapFile } from '@/lib/biblicalCounseling/secularTermMap'
import { buildSecularTermMapSectionHtml } from '@/lib/biblicalCounseling/secularTermMap'
import {
  buildKindleReadResourceSearchBlocks,
  kindleReadResourceSearchHitUrl,
  kindleReadResourceSearchPageUrl,
  renderKindleReadResourceSearchFormHtml,
  renderKindleReadResourceSearchResultsHtml,
  runKindleReadResourceSearch,
  searchKindleReadResourceBlocks,
} from '@/lib/kindleReadResourceSearch'
import type { GospelPresentationData } from '@/lib/types'

const sampleSections: GospelPresentationData = [
  {
    section: '1',
    title: 'Find your topic (secular terms)',
    subsections: [
      {
        title: '',
        content: '<p>Map intro about divorce and separation.</p>',
      },
    ],
  },
  {
    section: '2',
    title: 'Anxiety and Worry',
    subsections: [
      {
        title: 'Overview',
        content: '<p>When you feel anxious, remember Philippians 4:6.</p>',
        externalResourceLinks: [{ label: 'Article on worry', url: 'https://example.com' }],
        questions: [{ id: 'q1', question: '<p>How does anxiety affect your heart?</p>' }],
      },
    ],
  },
]

const testSecularMap: SecularTermMapFile = {
  pinnedSectionTitle: 'Find your topic (secular terms)',
  introHtml: '',
  mappings: [{ secularTerms: ['anxiety'], biblicalTopic: 'Anxiety and Worry' }],
}

describe('kindleReadResourceSearch', () => {
  it('buildKindleReadResourceSearchBlocks indexes titles, body, links, and questions', () => {
    const blocks = buildKindleReadResourceSearchBlocks(sampleSections)
    expect(blocks.some((b) => b.anchorId === 'section-2' && b.plainText.includes('Anxiety'))).toBe(
      true
    )
    expect(blocks.some((b) => b.anchorId === 'section-2-0' && b.plainText.includes('anxious'))).toBe(
      true
    )
    expect(blocks.some((b) => b.plainText.includes('Article on worry'))).toBe(true)
    expect(blocks.some((b) => b.plainText.includes('affect your heart'))).toBe(true)
  })

  it('searchKindleReadResourceBlocks returns hits with snippets', () => {
    const blocks = buildKindleReadResourceSearchBlocks(sampleSections)
    const hits = searchKindleReadResourceBlocks(blocks, 'anxious')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.anchorId).toBe('section-2-0')
    expect(hits[0]?.snippet.toLowerCase()).toContain('anxious')
  })

  it('runKindleReadResourceSearch returns null when query is too short', () => {
    expect(runKindleReadResourceSearch(sampleSections, 'an', 1)).toBeNull()
  })

  it('runKindleReadResourceSearch paginates and includes BC mapping hint', () => {
    const result = runKindleReadResourceSearch(sampleSections, 'anxiety', 1, {
      profileSlug: BIBLICAL_COUNSELING_REFERENCE_SLUG,
      secularTermMap: testSecularMap,
    })
    expect(result).not.toBeNull()
    expect(result?.total).toBeGreaterThan(0)
    expect(result?.mappingHint?.biblicalTopic).toBe('Anxiety and Worry')
  })

  it('prioritizes secular-term map section hits on BC profiles', () => {
    const sections: GospelPresentationData = [
      {
        section: '1',
        title: 'Find your topic (secular terms)',
        subsections: [{ title: '', content: '<p>divorce and separation map.</p>' }],
      },
      {
        section: '2',
        title: 'Divorce',
        subsections: [{ title: 'Overview', content: '<p>Teaching on divorce.</p>' }],
      },
    ]
    const blocks = buildKindleReadResourceSearchBlocks(sections)
    const hits = searchKindleReadResourceBlocks(blocks, 'divorce', {
      profileSlug: BIBLICAL_COUNSELING_REFERENCE_SLUG,
    })
    expect(hits.length).toBeGreaterThan(1)
    expect(hits[0]?.anchorId.startsWith('section-1')).toBe(true)
  })

  it('kindleReadResourceSearchPageUrl preserves translation, text size, and query', () => {
    expect(
      kindleReadResourceSearchPageUrl('default', 'worry', 2, {
        translation: 'kjv',
        textSize: 'larger',
      })
    ).toBe('/default/read/?q=worry&page=2&translation=kjv&textSize=larger')
  })

  it('renderKindleReadResourceSearchFormHtml includes GET form fields', () => {
    const html = renderKindleReadResourceSearchFormHtml('default', 'worry', 'kjv', 'larger')
    expect(html).toContain('method="get"')
    expect(html).toContain('name="q"')
    expect(html).toContain('value="worry"')
    expect(html).toContain('name="translation"')
    expect(html).toContain('name="textSize"')
  })

  it('renderKindleReadResourceSearchResultsHtml links hits to section anchors', () => {
    const result = runKindleReadResourceSearch(sampleSections, 'anxious', 1)!
    const html = renderKindleReadResourceSearchResultsHtml('default', result, 'esv', 'normal')
    expect(html).toContain('Search results')
    expect(html).toContain('href="/default/read/#section-2-0"')
    expect(html).toContain('Clear search')
  })

  it('indexes legacy map tables without wrap div or terms-cell class', () => {
    const legacyTable =
      '<table class="secular-term-map-table"><thead><tr><th>Secular</th><th>Topic</th></tr></thead><tbody><tr><td>divorce, separated</td><td class="secular-term-map-topic-cell">→ Divorce</td></tr><tr><td>anxiety</td><td class="secular-term-map-topic-cell">→ Anxiety</td></tr></tbody></table>'
    const sections: GospelPresentationData = [
      {
        section: '1',
        title: 'Find your topic (secular terms)',
        subsections: [{ title: '', content: legacyTable }],
      },
    ]
    const blocks = buildKindleReadResourceSearchBlocks(sections)
    expect(blocks.some((b) => b.anchorId === 'secular-term-map-row-0' && b.plainText.includes('divorce'))).toBe(
      true
    )
    expect(blocks.some((b) => b.anchorId === 'section-1-0' && b.plainText.includes('divorce'))).toBe(false)

    const hits = searchKindleReadResourceBlocks(blocks, 'divorce', {
      profileSlug: BIBLICAL_COUNSELING_REFERENCE_SLUG,
    })
    expect(hits[0]?.anchorId).toBe('secular-term-map-row-0')
    expect(kindleReadResourceSearchHitUrl('26b974ef', 'secular-term-map-row-0')).toBe(
      '/26b974ef/read/#secular-term-map-row-0'
    )
  })

  it('indexes secular-term map rows with per-row anchors', () => {
    const mapTableHtml = buildSecularTermMapSectionHtml(testSecularMap, new Map([['anxiety and worry', 'section-2']]))
    const sections: GospelPresentationData = [
      {
        section: '1',
        title: 'Find your topic (secular terms)',
        subsections: [{ title: '', content: mapTableHtml }],
      },
      {
        section: '2',
        title: 'Anxiety and Worry',
        subsections: [{ title: 'Overview', content: '<p>Teaching on anxiety.</p>' }],
      },
    ]
    const blocks = buildKindleReadResourceSearchBlocks(sections)
    expect(blocks.some((b) => b.anchorId === 'secular-term-map-row-0' && b.plainText.includes('anxiety'))).toBe(
      true
    )
    expect(blocks.some((b) => b.anchorId === 'section-1-0' && b.plainText.includes('anxiety'))).toBe(false)

    const hits = searchKindleReadResourceBlocks(blocks, 'anxiety', {
      profileSlug: BIBLICAL_COUNSELING_REFERENCE_SLUG,
    })
    expect(hits.some((h) => h.anchorId === 'secular-term-map-row-0')).toBe(true)

    const result = runKindleReadResourceSearch(sections, 'anxiety', 1, {
      profileSlug: BIBLICAL_COUNSELING_REFERENCE_SLUG,
      secularTermMap: testSecularMap,
    })!
    const html = renderKindleReadResourceSearchResultsHtml('26b974ef', result, 'esv', 'normal')
    expect(html).toContain('#secular-term-map-row-0')
    expect(html).toContain('/26b974ef/read/#secular-term-map-row-0')
  })
})
