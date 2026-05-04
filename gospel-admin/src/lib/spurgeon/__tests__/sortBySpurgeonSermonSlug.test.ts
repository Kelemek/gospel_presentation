import {
  compareSpurgeonSermonRows,
  compareSpurgeonSermonSlugs,
  sortBySpurgeonSermonSlug,
  sortSpurgeonSermonsByDisplayTitleAZ,
  spurgeonCatalogNumberFromSlug,
  spurgeonCatalogNumberFromTitle,
  spurgeonSermonDisplaySortKey,
  spurgeonSermonListSortKey,
  spurgeonSermonTitleForModalDisplay,
} from '@/lib/spurgeon/sortBySpurgeonSermonSlug'

describe('spurgeon sermon list sort', () => {
  it('parses catalog number from slug', () => {
    expect(spurgeonCatalogNumberFromSlug('sg00001')).toBe(1)
    expect(spurgeonCatalogNumberFromSlug('SG01162')).toBe(1162)
    expect(spurgeonCatalogNumberFromSlug('other')).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('parses leading Sermon N from title', () => {
    expect(spurgeonCatalogNumberFromTitle('Sermon 1162. Saving Faith')).toBe(1162)
    expect(spurgeonCatalogNumberFromTitle('Sermon 297-8. Mr. Evil')).toBe(297)
    expect(spurgeonCatalogNumberFromTitle('sermon 2. The Remembrance')).toBe(2)
    expect(spurgeonCatalogNumberFromTitle('No sermon number')).toBeNull()
  })

  it('spurgeonSermonTitleForModalDisplay strips catalog prefix only', () => {
    expect(spurgeonSermonTitleForModalDisplay('Sermon 42. Grace Abounding')).toBe('Grace Abounding')
    expect(spurgeonSermonTitleForModalDisplay('Sermon 297-8. A Tale')).toBe('A Tale')
    expect(spurgeonSermonTitleForModalDisplay('  sermon 1.  First  ')).toBe('First')
    expect(spurgeonSermonTitleForModalDisplay('Custom title without prefix')).toBe('Custom title without prefix')
    expect(spurgeonSermonTitleForModalDisplay('Sermon 12.')).toBe('Sermon 12.')
  })

  it('spurgeonSermonDisplaySortKey uses stripped title or slug', () => {
    expect(spurgeonSermonDisplaySortKey({ slug: 'sg00002', title: 'Sermon 2. Zebra' })).toBe('zebra')
    expect(spurgeonSermonDisplaySortKey({ slug: 'sg00001', title: 'Sermon 1. Alpha' })).toBe('alpha')
    expect(spurgeonSermonDisplaySortKey({ slug: 'sg00099', title: '' })).toBe('sg00099')
  })

  it('sortSpurgeonSermonsByDisplayTitleAZ orders A–Z by visible title, tie-break slug', () => {
    const rows = [
      { slug: 'sg00003', title: 'Sermon 3. Mice' },
      { slug: 'sg00001', title: 'Sermon 1. Ant' },
      { slug: 'sg00002', title: 'Sermon 2. Boat' },
    ]
    expect(sortSpurgeonSermonsByDisplayTitleAZ(rows).map((r) => r.slug)).toEqual(['sg00001', 'sg00002', 'sg00003'])
    const tie = [
      { slug: 'sg00002', title: 'Sermon 1. Same' },
      { slug: 'sg00001', title: 'Sermon 2. Same' },
    ]
    expect(sortSpurgeonSermonsByDisplayTitleAZ(tie).map((r) => r.slug)).toEqual(['sg00001', 'sg00002'])
  })

  it('sort key prefers title number over slug when both exist', () => {
    expect(
      spurgeonSermonListSortKey({
        slug: 'sg01162',
        title: 'Sermon 2. The Remembrance of Christ',
      })
    ).toBe(2)
    expect(
      spurgeonSermonListSortKey({
        slug: 'sg00002',
        title: 'Sermon 1162. Saving Faith',
      })
    ).toBe(1162)
  })

  it('compareSpurgeonSermonSlugs orders by slug number', () => {
    expect(compareSpurgeonSermonSlugs('sg00010', 'sg00002')).toBeGreaterThan(0)
    expect(compareSpurgeonSermonSlugs('sg00002', 'sg01162')).toBeLessThan(0)
  })

  it('compareSpurgeonSermonRows orders by title sermon number (user-visible)', () => {
    const rows = [
      { slug: 'sg01162', title: 'Sermon 2. B' },
      { slug: 'sg00002', title: 'Sermon 1162. A' },
      { slug: 'sg00001', title: 'Sermon 1. C' },
    ]
    const sorted = [...rows].sort(compareSpurgeonSermonRows)
    expect(sorted.map((r) => r.title)).toEqual([
      'Sermon 1. C',
      'Sermon 2. B',
      'Sermon 1162. A',
    ])
  })

  it('sortBySpurgeonSermonSlug falls back to slug when title has no Sermon N', () => {
    const rows = [
      { slug: 'sg00003', title: 'Untitled misc' },
      { slug: 'sg00001', title: 'Untitled a' },
      { slug: 'sg00002', title: 'Untitled b' },
    ]
    expect(sortBySpurgeonSermonSlug(rows).map((r) => r.slug)).toEqual(['sg00001', 'sg00002', 'sg00003'])
  })
})
