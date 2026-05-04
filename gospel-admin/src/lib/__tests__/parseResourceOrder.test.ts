import { parseResourceOrder } from '@/lib/types'

describe('parseResourceOrder', () => {
  it('returns empty for non-array', () => {
    expect(parseResourceOrder(null)).toEqual([])
    expect(parseResourceOrder({})).toEqual([])
  })

  it('parses templates, categories, and spurgeonLibrary', () => {
    const raw = [
      { type: 'template', slug: 'foo' },
      { type: 'spurgeonLibrary', title: '  Custom label  ' },
      { type: 'category', id: 'c1', name: 'Cat', templateSlugs: ['a', 123, 'b'] },
    ]
    expect(parseResourceOrder(raw)).toEqual([
      { type: 'template', slug: 'foo' },
      { type: 'spurgeonLibrary', title: 'Custom label' },
      { type: 'category', id: 'c1', name: 'Cat', templateSlugs: ['a', 'b'] },
    ])
  })

  it('defaults spurgeonLibrary title when missing', () => {
    expect(parseResourceOrder([{ type: 'spurgeonLibrary' }])).toEqual([
      { type: 'spurgeonLibrary', title: 'Spurgeon sermons' },
    ])
  })
})
