import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileHelpMenu, { buildProfileTutorialMenuItems } from '../ProfileHelpMenu'

jest.mock('@/lib/profileHelpTours', () => ({
  runAddCustomMemorizationFeatureTour: jest.fn(),
  runBibleTranslationFeatureTour: jest.fn(),
  runBookmarksFeatureTour: jest.fn(),
  runFullProfileHelpTutorial: jest.fn(),
  runHighlightsFeatureTour: jest.fn(),
  runMarriageSeminarResourcesTour: jest.fn(),
  runMemorizeFeatureTour: jest.fn(),
  runPrintFeatureTour: jest.fn(),
  runProfileListenFeatureTour: jest.fn(),
  runResourcesFeatureTour: jest.fn(),
  runScriptureHoverPreviewFeatureTour: jest.fn(),
  runScriptureModalFeatureTour: jest.fn(),
  runShareResourceFeatureTour: jest.fn(),
  runTableOfContentsFeatureTour: jest.fn(),
  runTextSizeFeatureTour: jest.fn(),
  runThemeFeatureTour: jest.fn(),
}))

import {
  runAddCustomMemorizationFeatureTour,
  runBibleTranslationFeatureTour,
  runBookmarksFeatureTour,
  runFullProfileHelpTutorial,
  runHighlightsFeatureTour,
  runMarriageSeminarResourcesTour,
  runMemorizeFeatureTour,
  runPrintFeatureTour,
  runProfileListenFeatureTour,
  runResourcesFeatureTour,
  runScriptureHoverPreviewFeatureTour,
  runScriptureModalFeatureTour,
  runShareResourceFeatureTour,
  runTableOfContentsFeatureTour,
  runTextSizeFeatureTour,
  runThemeFeatureTour,
} from '@/lib/profileHelpTours'

describe('buildProfileTutorialMenuItems', () => {
  const originalUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  it('includes Listen only when not an Android Web user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const idsDesktop = buildProfileTutorialMenuItems().map((i) => i.id)
    expect(idsDesktop).toContain('listen')
    expect(idsDesktop).toContain('highlights')
    expect(idsDesktop).toContain('share')

    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    const idsAndroid = buildProfileTutorialMenuItems().map((i) => i.id)
    expect(idsAndroid).not.toContain('listen')
    expect(idsAndroid).toContain('highlights')
    expect(idsAndroid).toContain('share')
  })

  it('orders header tutorials after theme and before resources', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const labels = buildProfileTutorialMenuItems().map((i) => i.label)
    const themeIdx = labels.findIndex((l) => /light and dark mode/i.test(l))
    const listenIdx = labels.findIndex((l) => /listen \(read aloud\)/i.test(l))
    const highlightsIdx = labels.findIndex((l) => /^highlights$/i.test(l))
    const shareIdx = labels.findIndex((l) => /share this resource/i.test(l))
    const resourcesIdx = labels.findIndex((l) => /resources menu/i.test(l))
    expect(themeIdx).toBeGreaterThan(-1)
    expect(listenIdx).toBeGreaterThan(themeIdx)
    expect(highlightsIdx).toBeGreaterThan(listenIdx)
    expect(shareIdx).toBeGreaterThan(highlightsIdx)
    expect(resourcesIdx).toBeGreaterThan(shareIdx)
  })
})

describe('ProfileHelpMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens tutorials menu from help button', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    expect(screen.getByRole('menu', { name: /tutorials/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^full walkthrough/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /using bookmarks/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /resources menu/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^table of contents/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^text size/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^print version/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^bible translation/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^scripture reader/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^verse memorization/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^add custom memorization/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^quick verse preview/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /marriage seminar resources/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /light and dark mode/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Highlights Save quotes/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /share this resource/i })).toBeInTheDocument()
  })

  it('lists light and dark mode after bookmarks and before resources', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    const labels = screen.getAllByRole('menuitem').map((el) => el.textContent ?? '')
    const bookmarksIdx = labels.findIndex((t) => /using bookmarks/i.test(t))
    const themeIdx = labels.findIndex((t) => /light and dark mode/i.test(t))
    const resourcesIdx = labels.findIndex((t) => /resources menu/i.test(t))
    expect(bookmarksIdx).toBeGreaterThan(-1)
    expect(themeIdx).toBeGreaterThan(bookmarksIdx)
    expect(resourcesIdx).toBeGreaterThan(themeIdx)
  })

  it('starts full walkthrough when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^full walkthrough/i }))

    await waitFor(() => {
      expect(runFullProfileHelpTutorial).toHaveBeenCalledTimes(1)
    })
  })

  it('starts bookmarks tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /using bookmarks/i }))

    await waitFor(() => {
      expect(runBookmarksFeatureTour).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('menu', { name: /tutorials/i })).not.toBeInTheDocument()
  })

  it('starts resources tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /resources menu/i }))

    await waitFor(() => {
      expect(runResourcesFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts table of contents tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^table of contents/i }))

    await waitFor(() => {
      expect(runTableOfContentsFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts text size tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^text size/i }))

    await waitFor(() => {
      expect(runTextSizeFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts print tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^print version/i }))

    await waitFor(() => {
      expect(runPrintFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts bible translation tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^bible translation/i }))

    await waitFor(() => {
      expect(runBibleTranslationFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts scripture modal tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^scripture reader/i }))

    await waitFor(() => {
      expect(runScriptureModalFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts verse memorization tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^verse memorization/i }))

    await waitFor(() => {
      expect(runMemorizeFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts add custom memorization tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^add custom memorization/i }))

    await waitFor(() => {
      expect(runAddCustomMemorizationFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts quick verse preview tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /^quick verse preview/i }))

    await waitFor(() => {
      expect(runScriptureHoverPreviewFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts theme tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /light and dark mode/i }))

    await waitFor(() => {
      expect(runThemeFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts marriage seminar tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /marriage seminar resources/i }))

    await waitFor(() => {
      expect(runMarriageSeminarResourcesTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts highlights tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /Highlights Save quotes/i }))

    await waitFor(() => {
      expect(runHighlightsFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts share tutorial when chosen', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /share this resource/i }))

    await waitFor(() => {
      expect(runShareResourceFeatureTour).toHaveBeenCalledTimes(1)
    })
  })

  it('starts listen tutorial when chosen on non-Android UA', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const user = userEvent.setup()
    const { unmount } = render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /listen \(read aloud\)/i }))

    await waitFor(() => {
      expect(runProfileListenFeatureTour).toHaveBeenCalledTimes(1)
    })
    unmount()
  })
})
