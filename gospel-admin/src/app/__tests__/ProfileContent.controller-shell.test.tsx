/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import ProfileContent from '../[slug]/ProfileContent'

jest.mock('@/hooks/useProfileContentHooks', () => ({
  useProfileContentHooks: jest.fn(),
}))

jest.mock('@/components/PresentationFirstVisitWelcome', () => ({
  __esModule: true,
  default: () => <div data-testid="first-visit-welcome" />,
}))

jest.mock('@/components/ProfileContentLayout', () => ({
  __esModule: true,
  default: ({ header }: { header: { profileSlug: string } }) => (
    <div data-testid="profile-content-layout">slug:{header.profileSlug}</div>
  ),
}))

jest.mock('@/components/ProfileContentFooter', () => ({
  __esModule: true,
  default: ({ enabledTranslationCodes }: { enabledTranslationCodes: string[] | null }) => (
    <div data-testid="profile-content-footer">
      codes:{enabledTranslationCodes?.join(',') ?? 'none'}
    </div>
  ),
}))

jest.mock('@/components/ProfileContentModals', () => ({
  __esModule: true,
  default: ({ scripture }: { scripture: { profileSlug: string } }) => (
    <div data-testid="profile-content-modals">modals:{scripture.profileSlug}</div>
  ),
}))

import { useProfileContentHooks } from '@/hooks/useProfileContentHooks'

const profileInfo = {
  title: 'Default',
  slug: 'default',
  favoriteScriptures: [],
}

describe('ProfileContent ready shell', () => {
  it('renders nothing when profile data is missing', () => {
    const { container } = render(
      <ProfileContent sections={undefined} profileInfo={undefined} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(useProfileContentHooks).not.toHaveBeenCalled()
  })

  it('renders layout, footer, and modals from the hooks view-model', () => {
    jest.mocked(useProfileContentHooks).mockReturnValue({
      footerAttributionEnabledCodes: ['ESV', 'KJV'],
      layout: {
        onOpenMenuHover: jest.fn(),
        header: {
          profileSlug: 'default',
        } as never,
        main: {} as never,
        slideout: null,
      },
      modals: {
        scripture: { profileSlug: 'default' } as never,
        study: {} as never,
      },
    })

    render(<ProfileContent sections={[]} profileInfo={profileInfo} />)

    expect(screen.getByTestId('first-visit-welcome')).toBeInTheDocument()
    expect(screen.getByTestId('profile-content-layout')).toHaveTextContent('slug:default')
    expect(screen.getByTestId('profile-content-footer')).toHaveTextContent('codes:ESV,KJV')
    expect(screen.getByTestId('profile-content-modals')).toHaveTextContent('modals:default')
  })
})
