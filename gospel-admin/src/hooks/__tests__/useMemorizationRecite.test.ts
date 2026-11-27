/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { useMemorizationRecite } from '@/hooks/useMemorizationRecite'

jest.mock('@/lib/isReciteRecordingSupported', () => ({
  isReciteRecordingSupported: jest.fn(() => true),
}))

class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true)
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  state = 'inactive'

  start() {
    this.state = 'recording'
    this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) })
  }

  stop() {
    this.state = 'inactive'
    this.onstop?.()
  }
}

describe('useMemorizationRecite', () => {
  const originalMediaRecorder = global.MediaRecorder
  const originalGetUserMedia = navigator.mediaDevices?.getUserMedia

  beforeEach(() => {
    // @ts-expect-error test mock
    global.MediaRecorder = MockMediaRecorder
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'hello world' }),
    }) as jest.Mock
  })

  afterEach(() => {
    global.MediaRecorder = originalMediaRecorder
    if (originalGetUserMedia) {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: originalGetUserMedia },
      })
    }
    jest.resetAllMocks()
  })

  it('records and transcribes via the API route', async () => {
    jest.useFakeTimers()
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)

    const { result } = renderHook(() => useMemorizationRecite())

    await act(async () => {
      await result.current.startRecording()
    })

    now += 2_000

    let captured: Awaited<ReturnType<typeof result.current.stopRecordingCapture>>
    await act(async () => {
      const stopPromise = result.current.stopRecordingCapture()
      await jest.advanceTimersByTimeAsync(500)
      captured = await stopPromise
    })

    expect(captured!.blob).toBeInstanceOf(Blob)

    await act(async () => {
      const transcript = await result.current.transcribeCapturedRecording({
        memorizedItemId: 'item-1',
        reference: 'John 3:16',
        blob: captured!.blob,
        audioSeconds: captured!.audioSeconds,
      })
      expect(transcript).toBe('hello world')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/memorization/recite/transcribe',
      expect.objectContaining({ method: 'POST' })
    )
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData
    expect(body.get('reference')).toBe('John 3:16')
    expect(body.get('prompt')).toBeNull()
    expect(body.getAll('keyterm')).toEqual([])

    jest.useRealTimers()
  })
})
