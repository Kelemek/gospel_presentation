import { renderHook, act } from '@testing-library/react'
import { usePassageAnchorKey } from '@/hooks/usePassageAnchorKey'

describe('usePassageAnchorKey', () => {
  it('returns null until content is ready, then remembers the key across reload', () => {
    const { result, rerender } = renderHook(
      ({ isOpen, contentReady, contentKey }) =>
        usePassageAnchorKey(isOpen, contentReady, contentKey),
      {
        initialProps: {
          isOpen: true,
          contentReady: false,
          contentKey: 'John 3:16|verse|esv|',
        },
      }
    )

    expect(result.current).toBeNull()

    rerender({
      isOpen: true,
      contentReady: true,
      contentKey: 'John 3:16|verse|esv|',
    })

    expect(result.current).toBe('John 3:16|verse|esv|')

    rerender({
      isOpen: true,
      contentReady: false,
      contentKey: 'John 3:17|verse|esv|',
    })

    expect(result.current).toBe('John 3:16|verse|esv|')
  })

  it('clears the anchor when the modal closes', () => {
    const { result, rerender } = renderHook(
      ({ isOpen, contentReady, contentKey }) =>
        usePassageAnchorKey(isOpen, contentReady, contentKey),
      {
        initialProps: {
          isOpen: true,
          contentReady: true,
          contentKey: 'Genesis 1:1|verse|esv|',
        },
      }
    )

    expect(result.current).toBe('Genesis 1:1|verse|esv|')

    act(() => {
      rerender({
        isOpen: false,
        contentReady: false,
        contentKey: 'Genesis 1:1|verse|esv|',
      })
    })

    expect(result.current).toBeNull()
  })
})
