import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminHeader from '../AdminHeader'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/profiles/s1/content',
}))

describe('AdminHeader', () => {
  beforeEach(() => {
    mockPush.mockClear()
    global.fetch = jest.fn()
  })

  it('renders title and description', () => {
    render(<AdminHeader title="Test Title" description="Test description" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <AdminHeader title="T" description="D" actions={<button>Save</button>} />
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('fetches profiles when showProfileSwitcher is true and shows dropdown', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        profiles: [
          { slug: 's1', title: 'Profile 1', isDefault: true },
          { slug: 's2', title: 'Profile 2', isDefault: false },
        ],
      }),
    })
    render(
      <AdminHeader
        title="Admin"
        description="Desc"
        showProfileSwitcher
        currentProfileSlug="s1"
      />
    )
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/profiles'))
    const profileButton = await screen.findByRole('button', { name: /Profile 1|Select Profile/i })
    const user = userEvent.setup({ delay: null })
    await user.click(profileButton)
    expect(screen.getByText('Profile 2')).toBeInTheDocument()
    await user.click(screen.getByText('Profile 2'))
    expect(mockPush).toHaveBeenCalledWith('/admin/profiles/s2/content')
  })

  it('handles fetch error without throwing', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    render(
      <AdminHeader title="Admin" description="Desc" showProfileSwitcher />
    )
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})
