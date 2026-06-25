import {
  renderKindleReadLibraryListHtml,
  renderKindleReadResourcesNavHtml,
} from '@/lib/kindleReadResources'
import type { KindleReadLibraryPage } from '@/lib/kindleReadLibraryData'
import type { PublicResourceItem } from '@/lib/supabase-data-service'

const sampleItems: PublicResourceItem[] = [
  { type: 'template', slug: 'default', title: 'The Gospel in its Context' },
  { type: 'template', slug: 'mchy', title: "M'Cheyne Bible Reading Plan" },
  { type: 'spurgeonLibrary', title: 'Spurgeon sermons' },
  { type: 'morningEveningLibrary', title: "Spurgeon's Morning & Evening" },
  {
    type: 'category',
    id: 'books',
    name: 'Books',
    children: [
      { type: 'template', slug: 'lbst', title: 'Systematic Theology' },
      { type: 'template', slug: 'mchy', title: "M'Cheyne Bible Reading Plan" },
      { type: 'henryLibrary', title: "Matthew Henry's Commentary" },
    ],
  },
]

describe('renderKindleReadResourcesNavHtml', () => {
  it('renders collapsible details menu with template and library links', () => {
    const html = renderKindleReadResourcesNavHtml(sampleItems, 'default')
    expect(html).toContain('<details class="kindle-read-resources">')
    expect(html).toContain('<summary class="kindle-read-resources-title">Resources</summary>')
    expect(html).toContain('<details class="kindle-read-resources-category">')
    expect(html).toContain('<div class="kindle-read-resources-category-body">')
    expect(html).toContain('/default/read/')
    expect(html).toContain('/lbst/read/')
    expect(html).toContain('/read/libraries/spurgeon/')
    expect(html).toContain('/read/libraries/henry/')
    expect(html).toContain('/read/calendar/morneve/?from=default')
    expect(html).toContain('/read/calendar/mcheyne/?from=default')
    expect(html).not.toContain('/mchy/read/')
    expect(html).not.toContain('/read/libraries/morneve/')
    expect(html).toContain('from=default')
  })

  it('returns empty string when no menu items', () => {
    expect(renderKindleReadResourcesNavHtml([], 'default')).toBe('')
  })
})

describe('renderKindleReadLibraryListHtml', () => {
  const samplePage: KindleReadLibraryPage = {
    kind: 'spurgeon',
    title: 'Spurgeon sermons',
    items: [{ slug: 'sg00042', title: 'Sermon 42. Grace Abounding' }],
    total: 150,
    page: 2,
    pageSize: 50,
    query: 'grace',
  }

  it('renders search form, results label, and q-aware pager links', () => {
    const html = renderKindleReadLibraryListHtml(samplePage, '/default/read/', 'default')
    expect(html).toContain('<form class="kindle-read-library-search" method="get"')
    expect(html).toContain('action="/read/libraries/spurgeon/"')
    expect(html).toContain('name="q"')
    expect(html).toContain('value="grace"')
    expect(html).toContain('name="from" value="default"')
    expect(html).toContain('Results for &ldquo;grace&rdquo;')
    expect(html).toContain('Clear search')
    expect(html).toContain('150 matches')
    expect(html).toContain('/read/libraries/spurgeon/?q=grace&amp;from=default">Previous page')
    expect(html).toContain('/read/libraries/spurgeon/?page=3&amp;q=grace&amp;from=default">Next page')
    expect(html).toContain('Grace Abounding')
    expect(html).toContain('/sg00042/read/')
  })

  it('omits clear search and uses items label when not searching', () => {
    const html = renderKindleReadLibraryListHtml(
      { ...samplePage, query: undefined, page: 1 },
      '/default/read/',
      'default'
    )
    expect(html).not.toContain('Clear search')
    expect(html).toContain('150 items')
  })
})
