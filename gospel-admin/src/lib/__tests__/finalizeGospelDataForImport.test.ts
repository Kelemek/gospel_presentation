import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import type { GospelPresentationData } from '@/lib/types'

describe('finalizeGospelDataForImport', () => {
  it('normalizes gospel_data and merges inline index keys with parser keys', () => {
    const data: GospelPresentationData = [
      {
        section: 'je01',
        title: 'Sermon',
        subsections: [
          {
            title: 'I',
            content: '<p>See Rom 8:28.</p>',
          },
        ],
      },
    ]
    const { gospelData, passageKeys } = finalizeGospelDataForImport(data, {
      additionalPassageKeys: ['PSA.23'],
    })
    expect(gospelData[0].subsections[0].content).toContain('Romans 8:28')
    expect(passageKeys).toEqual(expect.arrayContaining(['ROM.8.28', 'PSA.23']))
  })
})
