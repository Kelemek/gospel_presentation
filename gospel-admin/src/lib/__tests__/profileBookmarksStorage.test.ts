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

  it('rejects duplicate slug+anchor', () => {
    addBookmark({
      slug: 'abc',
      resourceTitle: 'R',
      anchorId: 'section-1-0',
      locationLabel: 'L',
    })
    const ok = addBookmark({
      slug: 'abc',
      resourceTitle: 'R2',
      anchorId: 'section-1-0',
      locationLabel: 'L2',
    })
    expect(ok).toBe(false)
    expect(loadBookmarks()).toHaveLength(1)
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
