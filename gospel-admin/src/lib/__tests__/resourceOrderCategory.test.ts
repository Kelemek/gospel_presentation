import {
  applyResourceOrderDrop,
  emptyCategory,
  orderContainsSpurgeonLibrary,
  parseResourceOrder,
} from '@/lib/resourceOrderCategory'

describe('parseResourceOrder category children', () => {
  it('migrates legacy templateSlugs to children', () => {
    expect(
      parseResourceOrder([
        { type: 'category', id: 'c1', name: 'Study', templateSlugs: ['lgal', 'default'] },
      ])
    ).toEqual([
      {
        type: 'category',
        id: 'c1',
        name: 'Study',
        children: [
          { type: 'template', slug: 'lgal' },
          { type: 'template', slug: 'default' },
        ],
      },
    ])
  })

  it('parses library rows inside category children', () => {
    expect(
      parseResourceOrder([
        {
          type: 'category',
          id: 'c1',
          name: 'Libraries',
          children: [
            { type: 'spurgeonLibrary', title: 'Sermons' },
            { type: 'morningEveningLibrary', title: 'Devotions' },
          ],
        },
      ])
    ).toEqual([
      {
        type: 'category',
        id: 'c1',
        name: 'Libraries',
        children: [
          { type: 'spurgeonLibrary', title: 'Sermons' },
          { type: 'morningEveningLibrary', title: 'Devotions' },
        ],
      },
    ])
  })
})

describe('applyResourceOrderDrop', () => {
  it('moves top-level Spurgeon library into a category', () => {
    const items = [
      { type: 'spurgeonLibrary' as const, title: 'Spurgeon sermons' },
      emptyCategory('c1', 'Study tools'),
    ]
    const next = applyResourceOrderDrop(
      items,
      { kind: 'top-level', index: 0 },
      { kind: 'category', categoryId: 'c1' }
    )
    expect(next).toEqual([
      {
        type: 'category',
        id: 'c1',
        name: 'Study tools',
        children: [{ type: 'spurgeonLibrary', title: 'Spurgeon sermons' }],
      },
    ])
    expect(orderContainsSpurgeonLibrary(next)).toBe(true)
  })

  it('moves category library child to top level', () => {
    const cat = {
      ...emptyCategory('c1', 'Study tools'),
      children: [{ type: 'morningEveningLibrary' as const, title: 'Morning & Evening' }],
    }
    const next = applyResourceOrderDrop(
      [cat],
      { kind: 'categoryChild', categoryId: 'c1', childIndex: 0 },
      { kind: 'top-level', index: 0 }
    )
    expect(next).toEqual([
      { type: 'morningEveningLibrary', title: 'Morning & Evening' },
      { type: 'category', id: 'c1', name: 'Study tools', children: [] },
    ])
  })
})
