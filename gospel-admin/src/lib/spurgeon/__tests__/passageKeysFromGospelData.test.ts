import {
  collectReferenceStringsFromGospelData,
  gospelHtmlToPlainForScriptureScan,
  passageKeysFromGospelPresentationData,
  sermonNumberFromSgSlug,
} from '@/lib/spurgeon/passageKeysFromGospelData'
import type { GospelPresentationData } from '@/lib/types'

describe('passageKeysFromGospelData', () => {
  it('sermonNumberFromSgSlug', () => {
    expect(sermonNumberFromSgSlug('sg00001')).toBe(1)
    expect(sermonNumberFromSgSlug('SG00123')).toBe(123)
    expect(sermonNumberFromSgSlug('default')).toBeNull()
  })

  it('gospelHtmlToPlainForScriptureScan strips tags', () => {
    expect(gospelHtmlToPlainForScriptureScan('<p>Acts <strong>1</strong>:1</p>')).toBe('Acts 1:1')
  })

  it('collects refs from HTML bodies and scripture cards', () => {
    const data: GospelPresentationData = [
      {
        section: 'sg00001',
        title: 'Sermon',
        subsections: [
          {
            title: 'Intro',
            content: '<p>See Romans 8:28 and John 3:16.</p>',
            scriptureReferences: [{ reference: 'Psalm 23:1' }],
            questions: [{ id: 'q1', question: 'What about Ephesians 2:8?', answer: '' }],
          },
        ],
      },
    ]
    const raw = collectReferenceStringsFromGospelData(data)
    expect(raw).toEqual(expect.arrayContaining(['Romans 8:28', 'John 3:16', 'Psalm 23:1', 'Ephesians 2:8']))
  })

  it('passageKeysFromGospelPresentationData returns canonical USFM keys', () => {
    const data: GospelPresentationData = [
      {
        section: 'sg00001',
        title: 'Sermon',
        subsections: [
          {
            title: 'I.',
            content: '<p>Philippians 2:1-3</p>',
          },
        ],
      },
    ]
    const keys = passageKeysFromGospelPresentationData(data)
    expect(keys).toEqual(
      expect.arrayContaining(['PHP.2.1-PHP.2.3', 'PHP.2.1', 'PHP.2.2', 'PHP.2.3'])
    )
  })
})
