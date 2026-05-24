import { CCEL_COPYRIGHT_ATTRIBUTIONS } from '@/lib/ccelCopyrightAttributions'

describe('CCEL_COPYRIGHT_ATTRIBUTIONS', () => {
  it('lists every imported CCEL corpus with unique titles', () => {
    const titles = CCEL_COPYRIGHT_ATTRIBUTIONS.map((a) => a.title)
    expect(titles).toEqual([
      "John Bunyan, The Pilgrim's Progress",
      'John Calvin, Commentaries',
      'Jonathan Edwards, Select Sermons',
      "Matthew Henry's Commentary on the Whole Bible",
      'Martin Luther, Commentary on Galatians',
      'Charles H. Spurgeon, Morning and Evening',
      'Charles H. Spurgeon sermons',
    ])
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('uses https ccel.org source links', () => {
    for (const { sourceHref } of CCEL_COPYRIGHT_ATTRIBUTIONS) {
      expect(sourceHref.startsWith('https://www.ccel.org/')).toBe(true)
    }
  })
})
