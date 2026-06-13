import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ProfilePageClient from '../ProfilePageClient'
import { useProfileWithCache } from '@/lib/useProfileWithCache'
import { createClient } from '@/lib/supabase/client'
import { useRouter, notFound } from 'next/navigation'

let mockReplace: jest.Mock
const mockRefresh = jest.fn()

jest.mock('../ProfileContent', () => ({
  __esModule: true,
  default: ({ profileInfo }: any) => (
    <div data-testid="profile-content">
      {profileInfo?.title}
      {profileInfo?.favoriteScriptures?.length ? (
        <span data-testid="favorite-scriptures">{profileInfo.favoriteScriptures.join(',')}</span>
      ) : null}
    </div>
  )
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  notFound: jest.fn()
}))

jest.mock('@/lib/useProfileWithCache')
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

jest.mock('@/lib/capacitorAppRecovery', () => ({
  attemptCapacitorRecoveryReload: jest.fn(() => false),
}))

import { attemptCapacitorRecoveryReload } from '@/lib/capacitorAppRecovery'

describe('ProfilePageClient', () => {
  const defaultProfile = {
    id: 'p1',
    slug: 'test',
    title: 'Test Profile',
    description: '',
    gospelData: [],
    isDefault: false,
    isTemplate: false,
    visitCount: 0,
    savedAnswers: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockReplace = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: mockReplace })
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: defaultProfile,
      isLoading: false,
      error: null,
      profileLoadSettled: true,
      refresh: mockRefresh
    })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null } }) }
    })
  })

  it('renders profile content when profile exists', async () => {
    render(<ProfilePageClient slug="test" />)

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeInTheDocument())
    expect(screen.getByTestId('profile-content')).toHaveTextContent('Test Profile')
    expect(screen.getByText(/The Gospel Presentation/i)).toBeInTheDocument()
  })

  it('shows loading state when useProfileWithCache returns isLoading true', () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: true,
      error: null,
      profileLoadSettled: true,
      refresh: mockRefresh
    })

    render(<ProfilePageClient slug="test" />)

    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument()
    expect(screen.queryByTestId('profile-content')).not.toBeInTheDocument()
  })

  it('renders cached profile while validation is still in progress', () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: defaultProfile,
      isLoading: false,
      error: null,
      profileLoadSettled: false,
      refresh: mockRefresh
    })

    render(<ProfilePageClient slug="test" />)

    expect(screen.getByTestId('profile-content')).toBeInTheDocument()
    expect(screen.queryByText(/Loading\.\.\./i)).not.toBeInTheDocument()
  })

  it('shows reconnecting state when load fails instead of a blank page', async () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: false,
      error: 'Failed to load profile',
      profileLoadSettled: true,
      refresh: mockRefresh
    })

    render(<ProfilePageClient slug="my-slug" />)

    expect(screen.getByText(/Reconnecting\.\.\./i)).toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(attemptCapacitorRecoveryReload).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })

  it('attempts native recovery reload at most once after refresh keeps failing', () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: false,
      error: 'Failed to load profile',
      profileLoadSettled: true,
      refresh: mockRefresh,
    })

    const { rerender } = render(<ProfilePageClient slug="my-slug" />)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(attemptCapacitorRecoveryReload).not.toHaveBeenCalled()

    const secondRefresh = jest.fn()
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: false,
      error: 'Failed to load profile',
      profileLoadSettled: true,
      refresh: secondRefresh,
    })
    rerender(<ProfilePageClient slug="my-slug" />)

    expect(attemptCapacitorRecoveryReload).toHaveBeenCalledTimes(1)
    expect(attemptCapacitorRecoveryReload).toHaveBeenCalledWith('profile-load-failed')
    expect(secondRefresh).not.toHaveBeenCalled()

    rerender(<ProfilePageClient slug="my-slug" />)

    expect(attemptCapacitorRecoveryReload).toHaveBeenCalledTimes(1)
  })

  it('does not treat a transient load error as a missing profile for signed-in users', async () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: false,
      error: 'Failed to load profile',
      profileLoadSettled: true,
      refresh: mockRefresh
    })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }
    })

    render(<ProfilePageClient slug="my-slug" />)

    await waitFor(() => {
      expect(screen.getByText(/Reconnecting\.\.\./i)).toBeInTheDocument()
    })
    expect(notFound).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects to login when profile is null after loading and user is not signed in', async () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      profileLoadSettled: true,
      refresh: mockRefresh
    })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null } }) }
    })

    render(<ProfilePageClient slug="my-slug" />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?redirect=/my-slug')
    })
  })

  it('calls notFound when profile is null after loading and user is signed in', async () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      profileLoadSettled: true,
      refresh: mockRefresh
    })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }
    })

    render(<ProfilePageClient slug="my-slug" />)

    await waitFor(() => {
      expect(notFound).toHaveBeenCalled()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('extracts favorite scriptures from sections and passes to ProfileContent', async () => {
    const gospelData = [
      {
        id: 's1',
        title: 'Section',
        subsections: [
          {
            id: 'sub1',
            title: 'Sub',
            scriptureReferences: [
              { reference: 'Gen 1:1', favorite: true },
              { reference: 'John 3:16', favorite: false }
            ],
            nestedSubsections: [
              {
                id: 'n1',
                title: 'Nested',
                scriptureReferences: [{ reference: 'Rom 8:28', favorite: true }]
              }
            ]
          }
        ]
      }
    ]
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: { ...defaultProfile, gospelData },
      isLoading: false,
      error: null,
      profileLoadSettled: true,
      refresh: mockRefresh
    })

    render(<ProfilePageClient slug="test" />)

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeInTheDocument())

    const favoritesEl = screen.getByTestId('favorite-scriptures')
    expect(favoritesEl).toHaveTextContent('Gen 1:1,Rom 8:28')
  })

  it('handles profile with empty gospelData', async () => {
    ;(useProfileWithCache as jest.Mock).mockReturnValue({
      profile: { ...defaultProfile, gospelData: undefined },
      isLoading: false,
      error: null,
      profileLoadSettled: true,
      refresh: mockRefresh
    })

    render(<ProfilePageClient slug="test" />)

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeInTheDocument())
    expect(screen.queryByTestId('favorite-scriptures')).not.toBeInTheDocument()
  })
})
