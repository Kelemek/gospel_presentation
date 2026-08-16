/**
 * @jest-environment jsdom
 */

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileSlideoutMenu from '@/components/ProfileSlideoutMenu'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { makeProfileSlideoutMenuProps } from '@/lib/testFixtures/profileContentLayoutProps'

jest.mock('@/components/TableOfContents', () => ({
  __esModule: true,
  default: ({
    onOpenBibleReader,
    onOpenSpurgeonLibrary,
  }: {
    onOpenBibleReader: () => void
    onOpenSpurgeonLibrary: (title?: string) => void
  }) => (
    <div data-testid="toc">
      <button type="button" onClick={onOpenBibleReader}>
        Bible Reader
      </button>
      <button type="button" onClick={() => onOpenSpurgeonLibrary('Sermons')}>
        Sermons
      </button>
    </div>
  ),
}))
jest.mock('@/components/DailyVerseChallengeCard', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/MenuLocalDataBackup', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/SidebarAuthNav', () => ({ __esModule: true, default: () => null }))

function renderMenu(overrides: Parameters<typeof makeProfileSlideoutMenuProps>[0] = {}) {
  const props = makeProfileSlideoutMenuProps(overrides)
  const view = render(
    <TextSizeProvider>
      <ProfileSlideoutMenu {...props} />
    </TextSizeProvider>
  )
  return { ...view, props }
}

describe('ProfileSlideoutMenu', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  })

  it('renders slide-out shell and table of contents', () => {
    renderMenu()
    expect(document.querySelector('[data-tour="profile-slideout-menu"]')).toBeTruthy()
    expect(screen.getByTestId('toc')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeTruthy()
    expect(screen.getByText('A gospel profile')).toBeInTheDocument()
  })

  it('closes from the close button and mobile backdrop', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderMenu({ onClose })

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    const backdrop = document.querySelector('.lg\\:hidden.fixed.inset-0')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes on desktop mouse leave unless file picker defer is set', () => {
    const onClose = jest.fn()
    const deferCloseMenuForFilePickerRef = { current: false }
    renderMenu({ onClose, deferCloseMenuForFilePickerRef })

    const panel = document.querySelector('[data-tour="profile-slideout-menu"]')!
    fireEvent.mouseLeave(panel)
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    deferCloseMenuForFilePickerRef.current = true
    fireEvent.mouseLeave(panel)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lists verse pins and clears them from the menu footer', async () => {
    const user = userEvent.setup()
    const onClearAllVersePins = jest.fn()
    renderMenu({
      onClearAllVersePins,
      versePinsList: [
        {
          reference: 'John 3:16',
          colorId: 'red',
          sectionId: 's1',
          subsectionId: 'ss1',
          bookmarkId: 'b1',
        },
      ],
    })

    expect(screen.getByText('Pinned passages (1)')).toBeInTheDocument()
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /Clear all pinned passages for this presentation/i })
    )
    expect(onClearAllVersePins).toHaveBeenCalledTimes(1)
  })

  it('forwards table-of-contents study actions to menu callbacks', async () => {
    const user = userEvent.setup()
    const onOpenBibleReader = jest.fn()
    const onOpenStudyLibrary = jest.fn()
    renderMenu({ onOpenBibleReader, onOpenStudyLibrary })

    await user.click(screen.getByRole('button', { name: 'Bible Reader' }))
    await user.click(screen.getByRole('button', { name: 'Sermons' }))
    expect(onOpenBibleReader).toHaveBeenCalledTimes(1)
    expect(onOpenStudyLibrary).toHaveBeenCalledWith('spurgeon', 'Sermons')
  })

  it('shows mark-unread control when presentation is marked read', async () => {
    const user = userEvent.setup()
    const onMarkPresentationUnread = jest.fn()
    renderMenu({ presentationMarkedReadComplete: true, onMarkPresentationUnread })

    await user.click(screen.getByRole('button', { name: /Mark this resource as unread/i }))
    expect(onMarkPresentationUnread).toHaveBeenCalledTimes(1)
  })
})
