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
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('includes Listen on desktop and on Android Chrome when speechSynthesis exists', () => {
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
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: jest.fn(), cancel: jest.fn() },
    })
    const idsAndroid = buildProfileTutorialMenuItems().map((i) => i.id)
    expect(idsAndroid).toContain('listen')
    expect(idsAndroid).toContain('highlights')
    expect(idsAndroid).toContain('share')
  })

  it('orders tutorials: full, theme, then header icons R-to-L (share, bookmarks, highlights, listen when shown), then resources', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const labels = buildProfileTutorialMenuItems().map((i) => i.label)
    const fullIdx = labels.findIndex((l) => /^full walkthrough$/i.test(l))
    const themeIdx = labels.findIndex((l) => /light and dark mode/i.test(l))
    const shareIdx = labels.findIndex((l) => /share this resource/i.test(l))
    const bookmarksIdx = labels.findIndex((l) => /using bookmarks/i.test(l))
    const highlightsIdx = labels.findIndex((l) => /^highlights$/i.test(l))
    const listenIdx = labels.findIndex((l) => /listen \(read aloud\)/i.test(l))
    const resourcesIdx = labels.findIndex((l) => /resources menu/i.test(l))
    expect(fullIdx).toBe(0)
    expect(themeIdx).toBe(1)
    expect(shareIdx).toBe(2)
    expect(bookmarksIdx).toBe(3)
    expect(highlightsIdx).toBe(4)
    expect(listenIdx).toBe(5)
    expect(resourcesIdx).toBe(6)
  })

  it('on Android without speechSynthesis omits Listen but keeps theme → share → bookmarks → highlights before resources', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    const labels = buildProfileTutorialMenuItems().map((i) => i.label)
    expect(labels.some((l) => /listen \(read aloud\)/i.test(l))).toBe(false)
    const themeIdx = labels.findIndex((l) => /light and dark mode/i.test(l))
    const shareIdx = labels.findIndex((l) => /share this resource/i.test(l))
    const bookmarksIdx = labels.findIndex((l) => /using bookmarks/i.test(l))
    const highlightsIdx = labels.findIndex((l) => /^highlights$/i.test(l))
    const resourcesIdx = labels.findIndex((l) => /resources menu/i.test(l))
    expect(themeIdx).toBe(1)
    expect(shareIdx).toBe(2)
    expect(bookmarksIdx).toBe(3)
    expect(highlightsIdx).toBe(4)
    expect(resourcesIdx).toBe(5)
  })
})

describe('ProfileHelpMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    })
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

  it('lists theme then share, bookmarks, highlights before resources', () => {
    const ids = buildProfileTutorialMenuItems().map((i) => i.id)
    const themeIdx = ids.indexOf('theme')
    const shareIdx = ids.indexOf('share')
    const bookmarksIdx = ids.indexOf('bookmarks')
    const highlightsIdx = ids.indexOf('highlights')
    const resourcesIdx = ids.indexOf('resources')
    expect(themeIdx).toBeLessThan(shareIdx)
    expect(shareIdx).toBeLessThan(bookmarksIdx)
    expect(bookmarksIdx).toBeLessThan(highlightsIdx)
    expect(highlightsIdx).toBeLessThan(resourcesIdx)
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

  it('always shows Change log in Support', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /change log/i })).toBeInTheDocument()
  })

  it('opens change log modal when chosen', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ groups: [] }),
    })
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    await user.click(screen.getByRole('menuitem', { name: /change log/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /change log/i })).toBeInTheDocument()
    })
  })

  it('shows Send feedback when enabled and opens modal', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    })
    const user = userEvent.setup()
    render(<ProfileHelpMenu profileSlug="default" profileTitle="Default" />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    expect(await screen.findByRole('menuitem', { name: /send feedback/i })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: /send feedback/i }))
    expect(screen.queryByRole('menu', { name: /tutorials/i })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('hides Send feedback when disabled', async () => {
    const user = userEvent.setup()
    render(<ProfileHelpMenu />)

    await user.click(screen.getByRole('button', { name: /help and tutorials/i }))
    expect(screen.queryByRole('menuitem', { name: /send feedback/i })).not.toBeInTheDocument()
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
