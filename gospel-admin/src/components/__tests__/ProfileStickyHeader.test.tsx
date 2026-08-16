/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileStickyHeader from '@/components/ProfileStickyHeader'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { makeProfileStickyHeaderProps } from '@/lib/testFixtures/profileContentLayoutProps'

jest.mock('@/components/ProfileHelpMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileResourceReadAloud', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/HighlightsDropdown', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileResourceTabs', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))

function renderHeader(overrides: Parameters<typeof makeProfileStickyHeaderProps>[0] = {}) {
  const props = makeProfileStickyHeaderProps(overrides)
  const view = render(
    <TextSizeProvider>
      <ProfileStickyHeader {...props} />
    </TextSizeProvider>
  )
  return { ...view, props }
}

describe('ProfileStickyHeader', () => {
  it('renders sticky header shell and menu button', () => {
    renderHeader()
    expect(document.querySelector('[data-profile-sticky-header]')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
    expect(document.querySelector('[data-tour="profile-menu-button"]')).toBeTruthy()
  })

  it('toggles menu and reflects open state in aria attributes', async () => {
    const user = userEvent.setup()
    const onToggleMenu = jest.fn()
    const { rerender, props } = renderHeader({ onToggleMenu })

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(onToggleMenu).toHaveBeenCalledTimes(1)

    rerender(
      <TextSizeProvider>
        <ProfileStickyHeader {...props} isMenuOpen onToggleMenu={onToggleMenu} />
      </TextSizeProvider>
    )
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows editor chrome only when canEdit and fromEditor are true', () => {
    const { rerender, props } = renderHeader({ canEdit: true, fromEditor: false })
    expect(screen.queryByRole('link', { name: /Edit/i })).not.toBeInTheDocument()

    rerender(
      <TextSizeProvider>
        <ProfileStickyHeader {...props} canEdit fromEditor />
      </TextSizeProvider>
    )
    expect(screen.getByRole('link', { name: /Edit/i })).toHaveAttribute(
      'href',
      '/admin/profiles/default/content'
    )
  })

  it('calls share handler and disables while sharing', async () => {
    const user = userEvent.setup()
    const onShareResource = jest.fn()
    const { rerender, props } = renderHeader({ onShareResource })

    await user.click(screen.getByRole('button', { name: 'Share this resource' }))
    expect(onShareResource).toHaveBeenCalledTimes(1)

    rerender(
      <TextSizeProvider>
        <ProfileStickyHeader {...props} isSharingResource onShareResource={onShareResource} />
      </TextSizeProvider>
    )
    expect(screen.getByRole('button', { name: 'Sharing…' })).toBeDisabled()
  })
})
