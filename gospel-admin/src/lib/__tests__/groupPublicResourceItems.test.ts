import { groupPublicResourceItems } from '@/lib/groupPublicResourceItems'
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
})
