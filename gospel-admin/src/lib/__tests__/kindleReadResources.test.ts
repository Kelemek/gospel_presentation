import { renderKindleReadResourcesNavHtml } from '@/lib/kindleReadResources'
import type { PublicResourceItem } from '@/lib/supabase-data-service'

const sampleItems: PublicResourceItem[] = [
  { type: 'template', slug: 'default', title: 'The Gospel in its Context' },
  { type: 'spurgeonLibrary', title: 'Spurgeon sermons' },
  {
    type: 'category',
    id: 'books',
    name: 'Books',
    children: [
      { type: 'template', slug: 'lbst', title: 'Systematic Theology' },
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
    expect(html).toContain('from=default')
  })

  it('returns empty string when no menu items', () => {
    expect(renderKindleReadResourcesNavHtml([], 'default')).toBe('')
  })
})
