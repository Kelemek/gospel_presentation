import { renderHook, act } from '@testing-library/react'
import { useProfileVersePins } from '@/hooks/useProfileVersePins'

jest.mock('@/lib/versePinStorage', () => ({
  createEmptyVersePinsState: jest.fn(() => ({ yellow: null, bookmarks: [] })),
  hydrateVersePinsFromStorage: jest.fn(() => Promise.resolve()),
  loadVersePins: jest.fn(() => ({ yellow: null, bookmarks: [] })),
  versePinsListFromState: jest.fn(() => []),
  removeVersePin: jest.fn(),
  clearAllVersePins: jest.fn(),
}))

import {
  clearAllVersePins,
  removeVersePin,
} from '@/lib/versePinStorage'

describe('useProfileVersePins', () => {
  it('clears all pins for the profile slug', () => {
    const { result } = renderHook(() => useProfileVersePins('default'))

    act(() => result.current.handleClearAllVersePins())

    expect(clearAllVersePins).toHaveBeenCalledWith('default')
  })

  it('removes a bookmark pin by id', () => {
    const { result } = renderHook(() => useProfileVersePins('default'))

    act(() =>
      result.current.handleRemoveVersePin({ bookmarkId: 'pin-1', colorId: 'blue' })
    )

    expect(removeVersePin).toHaveBeenCalledWith('default', {
      kind: 'bookmark',
      bookmarkId: 'pin-1',
    })
  })
})
