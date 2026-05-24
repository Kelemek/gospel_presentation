import { Capacitor } from '@capacitor/core'
import {
  formatScripturePassageForShare,
  shareScripturePassage,
} from '../shareScripturePassage'

const mockShare = jest.fn((_options?: unknown) => Promise.resolve())

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
}))

jest.mock('@capacitor/share', () => ({
  Share: {
    share: (options: unknown) => mockShare(options),
  },
}))

describe('formatScripturePassageForShare', () => {
  it('includes reference, translation label, and stripped passage text', () => {
    const formatted = formatScripturePassageForShare({
      reference: 'Psalm 113:5',
      translationLabel: 'ESV (English Standard Version)',
      passageText: '[5] Who is like the LORD our God, who is seated on high,',
    })
    expect(formatted).toContain('Psalm 113:5 (ESV (English Standard Version))')
    expect(formatted).toContain('Who is like the LORD our God')
    expect(formatted).not.toContain('[5]')
  })

  it('returns header only when passage is empty after strip', () => {
    expect(
      formatScripturePassageForShare({
        reference: 'John 3:16',
        translationLabel: 'ESV',
        passageText: '   ',
      })
    ).toBe('John 3:16 (ESV)')
  })

  it('appends deep link when pageUrl is set', () => {
    const formatted = formatScripturePassageForShare({
      reference: 'John 3:16',
      translationLabel: 'ESV',
      passageText: 'For God so loved the world.',
      pageUrl: 'https://example.com/default?scriptureRef=John%203%3A16',
    })
    expect(formatted).toContain('Open in The Gospel Presentation:')
    expect(formatted).toContain('https://example.com/default?scriptureRef=John%203%3A16')
  })
})

describe('shareScripturePassage', () => {
  const originalShare = global.navigator.share
  const originalClipboard = global.navigator.clipboard

  const sampleOptions = {
    reference: 'Psalm 113:5',
    translationLabel: 'ESV (English Standard Version)',
    passageText: 'Who is like the LORD our God, who is seated on high,',
  }

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

  it('embeds pageUrl in share text without a separate url field (avoids link-only shares)', async () => {
    const pageUrl = 'https://example.com/default?scriptureRef=Psalm%20113%3A5'
    const navShare = jest.fn((_opts?: unknown) => Promise.resolve())
    global.navigator.share = navShare

    await shareScripturePassage({ ...sampleOptions, pageUrl })

    expect(navShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(
          /Who is like the LORD[\s\S]*Open in The Gospel Presentation:[\s\S]*example\.com/
        ),
      })
    )
    const webSharePayload = navShare.mock.calls[0]?.[0] as Record<string, unknown> | undefined
    expect(webSharePayload).toBeDefined()
    expect(webSharePayload).not.toHaveProperty('url')
  })

  it('uses Capacitor Share on native platforms with passage text only in text field', async () => {
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('ios')
    const pageUrl = 'https://example.com/default?scriptureRef=Psalm%20113%3A5'

    const result = await shareScripturePassage({ ...sampleOptions, pageUrl })

    expect(result).toBe('shared')
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Psalm 113:5',
        text: expect.stringMatching(
          /Who is like the LORD[\s\S]*Open in The Gospel Presentation:[\s\S]*example\.com/
        ),
      })
    )
    expect(mockShare.mock.calls[0]?.[0]).not.toHaveProperty('url')
  })

  it('includes dialogTitle on Android native', async () => {
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')

    await shareScripturePassage({ ...sampleOptions, dialogTitle: 'Share passage' })

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        dialogTitle: 'Share passage',
      })
    )
  })

  it('falls back to navigator.share when not native', async () => {
    const navShare = jest.fn(() => Promise.resolve())
    global.navigator.share = navShare

    const result = await shareScripturePassage(sampleOptions)

    expect(result).toBe('shared')
    expect(navShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Psalm 113:5',
        text: expect.stringContaining('ESV (English Standard Version)'),
      })
    )
    expect(mockShare).not.toHaveBeenCalled()
  })

  it('returns cancelled on AbortError from navigator.share', async () => {
    const err = new DOMException('aborted', 'AbortError')
    global.navigator.share = jest.fn(() => Promise.reject(err))

    const result = await shareScripturePassage(sampleOptions)

    expect(result).toBe('cancelled')
  })

  it('copies formatted passage to clipboard when share is unavailable', async () => {
    const writeText = jest.fn((_text: string) => Promise.resolve())
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })

    const result = await shareScripturePassage(sampleOptions)

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Psalm 113:5 (ESV (English Standard Version))')
    )
    expect(writeText.mock.calls[0][0]).toContain('Who is like the LORD')
  })

  it('copies to clipboard when native share throws non-abort', async () => {
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    mockShare.mockRejectedValueOnce(new Error('plugin broken'))

    const writeText = jest.fn((_text: string) => Promise.resolve())
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })

    const result = await shareScripturePassage(sampleOptions)

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalled()
  })
})
