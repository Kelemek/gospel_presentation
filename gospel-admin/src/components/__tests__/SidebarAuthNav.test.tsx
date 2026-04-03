import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import SidebarAuthNav from '../SidebarAuthNav'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: jest.fn(() => false),
  },
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedIsNative = Capacitor.isNativePlatform as jest.MockedFunction<
  typeof Capacitor.isNativePlatform
>

describe('SidebarAuthNav', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedIsNative.mockReturnValue(false)
    mockedCreateClient.mockImplementation(() => ({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    }) as ReturnType<typeof createClient>)
  })

  it('renders Login link on web when not logged in', async () => {
    render(<SidebarAuthNav />)

    const login = await screen.findByRole('link', { name: /^Login$/i })
    expect(login).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument()
  })

  it('renders Dashboard link on web when logged in', async () => {
    mockedCreateClient.mockImplementation(() => ({
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1' } } }),
      },
    }) as ReturnType<typeof createClient>)

    render(<SidebarAuthNav />)

    const dashboard = await screen.findByRole('link', { name: /Dashboard/i })
    expect(dashboard).toHaveAttribute('href', '/admin')
    expect(screen.queryByRole('link', { name: /^Login$/i })).not.toBeInTheDocument()
  })

  it('renders nothing on native when not logged in', async () => {
    mockedIsNative.mockReturnValue(true)

    const { container } = render(<SidebarAuthNav />)

    await waitFor(() => {
      expect(mockedCreateClient).toHaveBeenCalled()
    })
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('link', { name: /^Login$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument()
  })

  it('renders Dashboard on native when logged in', async () => {
    mockedIsNative.mockReturnValue(true)
    mockedCreateClient.mockImplementation(() => ({
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1' } } }),
      },
    }) as ReturnType<typeof createClient>)

    render(<SidebarAuthNav />)

    const dashboard = await screen.findByRole('link', { name: /Dashboard/i })
    expect(dashboard).toHaveAttribute('href', '/admin')
  })
})
