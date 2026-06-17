const mockCapture = jest.fn()

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    __loaded: true,
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}))

jest.mock('@/lib/posthog-config', () => ({
  getPostHogProjectKey: jest.fn(),
}))

import { getPostHogProjectKey } from '@/lib/posthog-config'
import { captureModalOpened, capturePostHogEvent } from '@/lib/posthog-analytics'

const mockGetPostHogProjectKey = getPostHogProjectKey as jest.MockedFunction<
  typeof getPostHogProjectKey
>

describe('posthog-analytics', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockGetPostHogProjectKey.mockReturnValue('phc_test')
  })

  it('capturePostHogEvent is a no-op when PostHog key is unset', () => {
    mockGetPostHogProjectKey.mockReturnValue(undefined)
    capturePostHogEvent('test_event', { foo: 'bar' })
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('capturePostHogEvent calls posthog.capture when configured', () => {
    capturePostHogEvent('test_event', { foo: 'bar' })
    expect(mockCapture).toHaveBeenCalledWith('test_event', { foo: 'bar' })
  })

  it('captureModalOpened sends modal_opened with defined properties only', () => {
    captureModalOpened({
      modal: 'scripture',
      reference: 'John 3:16',
      profile_slug: 'default',
    })
    expect(mockCapture).toHaveBeenCalledWith('modal_opened', {
      modal: 'scripture',
      reference: 'John 3:16',
      profile_slug: 'default',
    })
  })

  it('captureModalOpened omits undefined optional properties', () => {
    captureModalOpened({ modal: 'coma' })
    expect(mockCapture).toHaveBeenCalledWith('modal_opened', { modal: 'coma' })
  })

  it('captureModalOpened includes bible_search translation', () => {
    captureModalOpened({ modal: 'bible_search', translation: 'esv' })
    expect(mockCapture).toHaveBeenCalledWith('modal_opened', {
      modal: 'bible_search',
      translation: 'esv',
    })
  })
})
