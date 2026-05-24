import { render } from '@testing-library/react'
import { PostHogPageView } from '../PostHogPageView'

const mockCapture = jest.fn()
let mockPathname = '/default/'
let mockSearchParams = new URLSearchParams('tab=1')

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    __loaded: true,
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}))

jest.mock('@/lib/posthog-config', () => ({
  getPostHogProjectKey: () => 'phc_test',
}))

describe('PostHogPageView', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockPathname = '/default/'
    mockSearchParams = new URLSearchParams('tab=1')
  })

  it('captures pageview with current url when PostHog is configured', () => {
    render(<PostHogPageView />)
    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('$pageview', {
      $current_url: expect.stringContaining('/default/?tab=1'),
    })
  })

  it('does not duplicate pageview when searchParams object identity changes but query is unchanged', () => {
    const { rerender } = render(<PostHogPageView />)
    expect(mockCapture).toHaveBeenCalledTimes(1)

    mockSearchParams = new URLSearchParams('tab=1')
    rerender(<PostHogPageView />)
    expect(mockCapture).toHaveBeenCalledTimes(1)
  })

  it('captures another pageview when pathname or search string changes', () => {
    const { rerender } = render(<PostHogPageView />)
    expect(mockCapture).toHaveBeenCalledTimes(1)

    mockPathname = '/copyright/'
    rerender(<PostHogPageView />)
    expect(mockCapture).toHaveBeenCalledTimes(2)
    expect(mockCapture).toHaveBeenLastCalledWith('$pageview', {
      $current_url: expect.stringContaining('/copyright/?tab=1'),
    })

    mockSearchParams = new URLSearchParams('tab=2')
    rerender(<PostHogPageView />)
    expect(mockCapture).toHaveBeenCalledTimes(3)
    expect(mockCapture).toHaveBeenLastCalledWith('$pageview', {
      $current_url: expect.stringContaining('tab=2'),
    })
  })
})
