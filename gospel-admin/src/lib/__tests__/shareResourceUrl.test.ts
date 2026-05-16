import { Capacitor } from '@capacitor/core'
import { shareResourceUrl } from '../shareResourceUrl'

const mockShare = jest.fn(() => Promise.resolve())

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
}))

jest.mock('@capacitor/share', () => ({
  Share: {
    share: (...args: unknown[]) => mockShare(...args),
  },
}))

describe('shareResourceUrl', () => {
  const originalShare = global.navigator.share
  const originalClipboard = global.navigator.clipboard

  beforeEach(() => {
    jest.clearAllMocks()
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('web')
    delete (global.navigator as any).share
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: jest.fn(() => Promise.resolve()) },
    })
  })

  afterEach(() => {
    if (originalShare) {
      global.navigator.share = originalShare
    } else {
      delete (global.navigator as any).share
    }
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: originalClipboard,
    })
  })

  it('uses Capacitor Share on native platforms', async () => {
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('ios')

    const result = await shareResourceUrl({
      url: 'https://example.com/my-profile',
      title: 'My Profile',
    })

    expect(result).toBe('shared')
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/my-profile',
        title: 'My Profile',
      })
    )
  })

  it('includes dialogTitle on Android native', async () => {
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')

    await shareResourceUrl({
      url: 'https://example.com/x',
      title: 'T',
      dialogTitle: 'Share presentation',
    })

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        dialogTitle: 'Share presentation',
      })
    )
  })

  it('falls back to navigator.share when not native', async () => {
    const navShare = jest.fn(() => Promise.resolve())
    global.navigator.share = navShare

    const result = await shareResourceUrl({ url: 'https://example.com/a' })

    expect(result).toBe('shared')
    expect(navShare).toHaveBeenCalled()
    expect(mockShare).not.toHaveBeenCalled()
  })

  it('returns cancelled on AbortError from navigator.share', async () => {
    const err = new DOMException('aborted', 'AbortError')
    global.navigator.share = jest.fn(() => Promise.reject(err))

    const result = await shareResourceUrl({ url: 'https://example.com/b' })

    expect(result).toBe('cancelled')
  })

  it('copies to clipboard when share is unavailable', async () => {
    const writeText = jest.fn(() => Promise.resolve())
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })

    const result = await shareResourceUrl({ url: 'https://example.com/c' })

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.com/c')
  })

  it('copies to clipboard when native share throws non-abort', async () => {
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    mockShare.mockRejectedValueOnce(new Error('plugin broken'))

    const writeText = jest.fn(() => Promise.resolve())
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })

    const result = await shareResourceUrl({ url: 'https://example.com/d' })

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.com/d')
  })
})
