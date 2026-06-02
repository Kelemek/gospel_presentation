import {
  groupPublicResourceItems,
  publicResourceItemsForResourcesMenu,
  resolveBibleReaderMenuTitle,
} from '@/lib/groupPublicResourceItems'
import type { PublicResourceItem } from '@/lib/supabase-data-service'

function tpl(slug: string, title: string): Extract<PublicResourceItem, { type: 'template' }> {
  return { type: 'template', slug, title }
}

function cat(
  id: string,
  name: string,
  children: Extract<PublicResourceItem, { type: 'category' }>['children'] = []
): Extract<PublicResourceItem, { type: 'category' }> {
  return { type: 'category', id, name, children }
}

describe('groupPublicResourceItems', () => {
  it('returns empty for empty input', () => {
    expect(groupPublicResourceItems([])).toEqual([])
  })

  it('groups consecutive templates into one block', () => {
    const items: PublicResourceItem[] = [tpl('a', 'A'), tpl('b', 'B'), cat('c1', 'Cat')]
    expect(groupPublicResourceItems(items)).toEqual([
      { kind: 'templates', items: [tpl('a', 'A'), tpl('b', 'B')] },
      { kind: 'category', item: cat('c1', 'Cat') },
    ])
  })

  it('separates template runs when a category sits between them', () => {
    const items: PublicResourceItem[] = [
      tpl('a', 'A'),
      cat('c1', 'Cat'),
      tpl('b', 'B'),
    ]
    expect(groupPublicResourceItems(items)).toEqual([
      { kind: 'templates', items: [tpl('a', 'A')] },
      { kind: 'category', item: cat('c1', 'Cat') },
      { kind: 'templates', items: [tpl('b', 'B')] },
    ])
  })

  it('emits spurgeonLibrary between template runs', () => {
    const items: PublicResourceItem[] = [
      tpl('a', 'A'),
      { type: 'spurgeonLibrary', title: 'Spurgeon sermons' },
      tpl('b', 'B'),
    ]
    expect(groupPublicResourceItems(items)).toEqual([
      { kind: 'templates', items: [tpl('a', 'A')] },
      { kind: 'spurgeonLibrary', title: 'Spurgeon sermons' },
      { kind: 'templates', items: [tpl('b', 'B')] },
    ])
  })

  it('emits edwardsLibrary row', () => {
    const items: PublicResourceItem[] = [
      { type: 'edwardsLibrary', title: 'Jonathan Edwards sermons' },
    ]
    expect(groupPublicResourceItems(items)).toEqual([
      { kind: 'edwardsLibrary', title: 'Jonathan Edwards sermons' },
    ])
  })

  it('does not emit a group for bibleReader (main menu control)', () => {
    const items: PublicResourceItem[] = [{ type: 'bibleReader', title: 'Read the Bible' }]
    expect(groupPublicResourceItems(items)).toEqual([])
  })
})

describe('resolveBibleReaderMenuTitle', () => {
  it('reads top-level bibleReader title', () => {
    expect(
      resolveBibleReaderMenuTitle([{ type: 'bibleReader', title: 'Read the Bible' }])
    ).toBe('Read the Bible')
  })

  it('reads bibleReader nested in a category', () => {
    expect(
      resolveBibleReaderMenuTitle([
        cat('books', 'Books', [{ type: 'bibleReader', title: 'Open Bible' }]),
      ])
    ).toBe('Open Bible')
  })
})

describe('publicResourceItemsForResourcesMenu', () => {
  it('removes bibleReader from top level and category children', () => {
    const items: PublicResourceItem[] = [
      { type: 'bibleReader', title: 'Bible Reader' },
      cat('c1', 'Mixed', [
        { type: 'bibleReader', title: 'Nested reader' },
        tpl('t1', 'Template One'),
      ]),
      tpl('t2', 'Template Two'),
    ]
    expect(publicResourceItemsForResourcesMenu(items)).toEqual([
      cat('c1', 'Mixed', [tpl('t1', 'Template One')]),
      tpl('t2', 'Template Two'),
    ])
  })
})
