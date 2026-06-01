import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { resetGospelStorageTestState, installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import {
  PROFILE_BOOKMARKS_STORAGE_KEY,
  addBookmark,
  loadBookmarks,
  removeBookmark,
} from '../profileBookmarksStorage'

describe('profileBookmarksStorage', () => {
  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
  })

  it('adds and loads bookmarks', () => {
    expect(loadBookmarks()).toEqual([])
    const ok = addBookmark({
      slug: 'abc',
      resourceTitle: 'R',
      anchorId: 'section-1-0',
      locationLabel: 'L',
    })
    expect(ok).toBe(true)
    const list = loadBookmarks()
    expect(list).toHaveLength(1)
    expect(list[0].slug).toBe('abc')
    expect(list[0].anchorId).toBe('section-1-0')
  })

  it('rejects duplicate slug+anchor+offset', () => {
    addBookmark({
      slug: 'abc',
      resourceTitle: 'R',
      anchorId: 'section-1-0',
      locationLabel: 'L',
      plainOffset: 10,
      fingerprint: 'fp',
    })
    const ok = addBookmark({
      slug: 'abc',
      resourceTitle: 'R2',
      anchorId: 'section-1-0',
      locationLabel: 'L2',
      plainOffset: 10,
      fingerprint: 'fp',
    })
    expect(ok).toBe(false)
    expect(loadBookmarks()).toHaveLength(1)
  })

  it('allows two bookmarks in same section at different offsets', () => {
    addBookmark({
      slug: 'abc',
      resourceTitle: 'R',
      anchorId: 'section-1-0',
      locationLabel: 'L',
      plainOffset: 10,
      fingerprint: 'fp',
    })
    const ok = addBookmark({
      slug: 'abc',
      resourceTitle: 'R',
      anchorId: 'section-1-0',
      locationLabel: 'L',
      plainOffset: 200,
      fingerprint: 'fp',
    })
    expect(ok).toBe(true)
    expect(loadBookmarks()).toHaveLength(2)
  })

  it('loads v1 bookmarks without offset fields', () => {
    gospelStorageSetSync(
      PROFILE_BOOKMARKS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        bookmarks: [
          {
            id: 'legacy',
            slug: 's',
            resourceTitle: 'T',
            anchorId: 'section-1',
            locationLabel: 'Loc',
            createdAt: 1,
          },
        ],
      })
    )
    const list = loadBookmarks()
    expect(list).toHaveLength(1)
    expect(list[0].plainOffset).toBeUndefined()
  })

  it('removeBookmark removes by id', () => {
    addBookmark({
      slug: 'x',
      resourceTitle: 'T',
      anchorId: 'section-1',
      locationLabel: 'loc',
    })
    const id = loadBookmarks()[0].id
    removeBookmark(id)
    expect(loadBookmarks()).toEqual([])
  })

  it('returns empty on corrupt JSON', () => {
    gospelStorageSetSync(PROFILE_BOOKMARKS_STORAGE_KEY, 'not-json')
    expect(loadBookmarks()).toEqual([])
  })
})
