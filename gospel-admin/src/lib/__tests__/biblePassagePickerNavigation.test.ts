import {
  adjacentPickerPassage,
  pickerPassageHasNext,
  pickerPassageHasPrevious,
} from '@/lib/biblePassagePickerNavigation'

describe('biblePassagePickerNavigation', () => {
  it('steps verses within a chapter', () => {
    expect(adjacentPickerPassage('John 3:16', 'prev')).toEqual({
      reference: 'John 3:15',
      initialChapterView: false,
    })
    expect(adjacentPickerPassage('John 3:16', 'next')).toEqual({
      reference: 'John 3:17',
      initialChapterView: false,
    })
  })

  it('steps from verse range end on next and range start on prev', () => {
    expect(adjacentPickerPassage('John 3:16-18', 'prev')).toEqual({
      reference: 'John 3:15',
      initialChapterView: false,
    })
    expect(adjacentPickerPassage('John 3:16-18', 'next')).toEqual({
      reference: 'John 3:19',
      initialChapterView: false,
    })
  })

  it('steps chapters for chapter-only references', () => {
    expect(adjacentPickerPassage('Genesis 1', 'next')).toEqual({
      reference: 'Genesis 2',
      initialChapterView: true,
    })
    expect(adjacentPickerPassage('Genesis 2', 'prev')).toEqual({
      reference: 'Genesis 1',
      initialChapterView: true,
    })
    expect(adjacentPickerPassage('Genesis 1', 'prev')).toBeNull()
  })

  it('uses Psalm for psalms book', () => {
    expect(adjacentPickerPassage('Psalm 23', 'next')?.reference).toBe('Psalm 24')
  })

  it('reports boundaries for has prev/next', () => {
    expect(pickerPassageHasPrevious('John 3:16')).toBe(true)
    expect(pickerPassageHasNext('John 3:16')).toBe(true)
    expect(pickerPassageHasPrevious('Genesis 1')).toBe(false)
    expect(pickerPassageHasNext('Revelation 22')).toBe(false)
  })
})
