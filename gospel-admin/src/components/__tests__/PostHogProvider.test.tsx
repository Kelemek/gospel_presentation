import { render, screen } from '@testing-library/react'
import { PostHogProvider } from '../PostHogProvider'

const mockInitPostHogClient = jest.fn()

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: { __loaded: false, init: jest.fn() },
}))

jest.mock('@/lib/posthog-config', () => ({
  initPostHogClient: (...args: unknown[]) => mockInitPostHogClient(...args),
}))

describe('PostHogProvider', () => {
  beforeEach(() => {
    mockInitPostHogClient.mockClear()
  })

  it('attempts PostHog init on mount as fallback', () => {
    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    )
    expect(screen.getByText('child')).toBeInTheDocument()
    expect(mockInitPostHogClient).toHaveBeenCalledTimes(1)
  })
})
