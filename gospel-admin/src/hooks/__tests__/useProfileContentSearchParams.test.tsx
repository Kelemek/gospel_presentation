import { renderHook } from '@testing-library/react'
import { useProfileContentSearchParams } from '@/hooks/useProfileContentSearchParams'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

import { useSearchParams } from 'next/navigation'

describe('useProfileContentSearchParams', () => {
  it('delegates to parseProfileContentSearchParams', () => {
    jest
      .mocked(useSearchParams)
      .mockReturnValue(new URLSearchParams('studyRef=Romans+8%3A1') as never)

    const { result } = renderHook(() => useProfileContentSearchParams())

    expect(result.current.studyRefParam).toBe('Romans 8:1')
  })
})
