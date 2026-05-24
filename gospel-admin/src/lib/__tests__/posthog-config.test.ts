import type { PostHogConfig } from 'posthog-js'
import {
  getPostHogApiHost,
  getPostHogClientInitOptions,
  getPostHogProjectKey,
  initPostHogClient,
  POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
} from '../posthog-config'

describe('posthog-config', () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

  afterEach(() => {
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey
    if (originalHost === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    else process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost
  })

  it('returns undefined key when env is missing or blank', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    expect(getPostHogProjectKey()).toBeUndefined()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = '   '
    expect(getPostHogProjectKey()).toBeUndefined()
  })

  it('returns trimmed project key from env', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = '  phc_test  '
    expect(getPostHogProjectKey()).toBe('phc_test')
  })

  it('defaults api host to US ingest when unset', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    expect(getPostHogApiHost()).toBe('https://us.i.posthog.com')
  })

  it('uses custom api host when set', () => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com'
    expect(getPostHogApiHost()).toBe('https://eu.i.posthog.com')
  })

  it('enables exception capture and masks session replay content', () => {
    const options = getPostHogClientInitOptions()
    expect(options.capture_exceptions).toBe(true)
    expect(options.session_recording.maskAllInputs).toBe(true)
    expect(options.session_recording.maskTextSelector).toBe('*')
    expect(POSTHOG_SESSION_RECORDING_SAMPLE_RATE).toBeGreaterThan(0)
    expect(POSTHOG_SESSION_RECORDING_SAMPLE_RATE).toBeLessThanOrEqual(1)
  })

  it('loaded callback stops recording when random exceeds sample rate', () => {
    const stopSessionRecording = jest.fn()
    const options = getPostHogClientInitOptions()

    jest.spyOn(Math, 'random').mockReturnValue(0.99)
    options.loaded({ stopSessionRecording } as Parameters<PostHogConfig['loaded']>[0])
    expect(stopSessionRecording).toHaveBeenCalled()

    jest.spyOn(Math, 'random').mockReturnValue(0)
    stopSessionRecording.mockClear()
    options.loaded({ stopSessionRecording } as Parameters<PostHogConfig['loaded']>[0])
    expect(stopSessionRecording).not.toHaveBeenCalled()

    jest.restoreAllMocks()
  })

  it('initPostHogClient initializes once when key is set', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
    const init = jest.fn(() => {
      posthog.__loaded = true
    })
    const posthog = { __loaded: false as boolean | undefined, init }

    expect(initPostHogClient(posthog)).toBe(true)
    expect(init).toHaveBeenCalledTimes(1)
    expect(initPostHogClient(posthog)).toBe(false)
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('initPostHogClient skips when key is missing or already loaded', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    const init = jest.fn()
    expect(initPostHogClient({ __loaded: false, init })).toBe(false)
    expect(init).not.toHaveBeenCalled()

    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
    expect(initPostHogClient({ __loaded: true, init })).toBe(false)
    expect(init).not.toHaveBeenCalled()
  })
})
