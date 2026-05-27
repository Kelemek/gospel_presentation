import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import {
  isChapterOnlyScriptureReference,
  isSingleChapterBookChapterOneReference,
  parseReference,
  scriptureReferenceForPassageQuery,
} from '@/lib/parse-scripture-reference'

describe('parse-scripture-reference', () => {
  describe('parseReference', () => {
    it('parses verse and chapter-only references', () => {
      expect(parseReference('John 3:16')).toEqual({
        book: 'John',
        chapter: 3,
        verseStart: 16,
        verseEnd: null,
      })
      expect(parseReference('Genesis 1')).toEqual({
        book: 'Genesis',
        chapter: 1,
        verseStart: null,
        verseEnd: null,
      })
    })
  })

  describe('isChapterOnlyScriptureReference', () => {
    it('returns true for whole-chapter refs', () => {
      expect(isChapterOnlyScriptureReference('Genesis 1')).toBe(true)
      expect(isChapterOnlyScriptureReference('Matthew 1')).toBe(true)
      expect(isChapterOnlyScriptureReference('Psalm 23')).toBe(true)
    })

    it('returns false when a verse is present', () => {
      expect(isChapterOnlyScriptureReference('John 3:16')).toBe(false)
      expect(isChapterOnlyScriptureReference('Genesis 1:1-3')).toBe(false)
    })
  })

  describe('single-chapter books', () => {
    it('detects M\'Cheyne-style one-chapter book refs', () => {
      expect(isSingleChapterBookChapterOneReference('Obadiah 1')).toBe(true)
      expect(isSingleChapterBookChapterOneReference('Philemon 1')).toBe(true)
      expect(isSingleChapterBookChapterOneReference('2 John 1')).toBe(true)
      expect(isSingleChapterBookChapterOneReference('Jude 1')).toBe(true)
    })

    it('does not treat multi-chapter books as single-chapter', () => {
      expect(isSingleChapterBookChapterOneReference('Genesis 1')).toBe(false)
      expect(isSingleChapterBookChapterOneReference('John 3')).toBe(false)
      expect(isSingleChapterBookChapterOneReference('Obadiah 1:5')).toBe(false)
    })

    it('expands to full chapter for ESV passage queries', () => {
      expect(scriptureReferenceForPassageQuery('Obadiah 1')).toBe('Obadiah 1:1-21')
      expect(scriptureReferenceForPassageQuery('Philemon 1')).toBe('Philemon 1:1-25')
      expect(scriptureReferenceForPassageQuery('2 John 1')).toBe('2 John 1:1-13')
      expect(scriptureReferenceForPassageQuery('Genesis 1')).toBe('Genesis 1')
      expect(scriptureReferenceForPassageQuery('John 3:16')).toBe('John 3:16')
    })

    it('uses a distinct cache key from the unexpanded M\'Cheyne card reference', () => {
      const displayRef = '2 John 1'
      const queryRef = scriptureReferenceForPassageQuery(displayRef)
      expect(queryRef).toBe('2 John 1:1-13')
      expect(canonicalScriptureCacheReference(displayRef)).toBe('2JN.1')
      expect(canonicalScriptureCacheReference(queryRef)).toBe('2JN.1.1-2JN.1.13')
    })
  })
})
