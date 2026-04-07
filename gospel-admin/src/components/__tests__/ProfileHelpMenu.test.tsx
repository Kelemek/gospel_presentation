import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileHelpMenu from '../ProfileHelpMenu'

jest.mock('@/lib/profileHelpTours', () => ({
  runBibleTranslationFeatureTour: jest.fn(),
  runBookmarksFeatureTour: jest.fn(),
  runFullProfileHelpTutorial: jest.fn(),
  runMarriageSeminarResourcesTour: jest.fn(),
  runPrintFeatureTour: jest.fn(),
  runResourcesFeatureTour: jest.fn(),
  runScriptureHoverPreviewFeatureTour: jest.fn(),
  runScriptureModalFeatureTour: jest.fn(),
  runTableOfContentsFeatureTour: jest.fn(),
  runTextSizeFeatureTour: jest.fn(),
  runThemeFeatureTour: jest.fn(),
}))

import {
  runBibleTranslationFeatureTour,
  runBookmarksFeatureTour,
  runFullProfileHelpTutorial,
  runMarriageSeminarResourcesTour,
  runPrintFeatureTour,
  runResourcesFeatureTour,
  runScriptureHoverPreviewFeatureTour,
  runScriptureModalFeatureTour,
  runTableOfContentsFeatureTour,
  runTextSizeFeatureTour,
  runThemeFeatureTour,
} from '@/lib/profileHelpTours'

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
    expect(screen.getByRole('menuitem', { name: /^quick verse preview/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /marriage seminar resources/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /light and dark mode/i })).toBeInTheDocument()
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
})
