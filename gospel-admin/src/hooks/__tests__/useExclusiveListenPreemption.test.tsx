/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react'
import { claimExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import { useExclusiveListenPreemption } from '@/hooks/useExclusiveListenPreemption'

describe('useExclusiveListenPreemption', () => {
  it('calls onPreempted when another owner claims exclusive listen', () => {
    const onPreempted = jest.fn()
    renderHook(() => useExclusiveListenPreemption(onPreempted, 'memorize-practice'))

    claimExclusiveListenOwner('profile-resource-read-aloud')
    expect(onPreempted).toHaveBeenCalledTimes(1)

    claimExclusiveListenOwner('memorize-practice')
    expect(onPreempted).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    const onPreempted = jest.fn()
    const { unmount } = renderHook(() =>
      useExclusiveListenPreemption(onPreempted, 'scripture-chapter-audio')
    )

    unmount()
    claimExclusiveListenOwner('profile-resource-read-aloud')
    expect(onPreempted).not.toHaveBeenCalled()
  })
})
