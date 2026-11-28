import { render, screen, waitFor } from '@testing-library/react'
import UsersPage from '@/app/admin/users/page'

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin-1' } } }),
    },
    from: () => ({
      select: () => ({
        order: async () => ({
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              display_name: 'pat@example.com',
              role: 'user',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-02T00:00:00.000Z',
            },
          ],
          error: null,
        }),
        eq: () => ({
          single: async () => ({ data: { role: 'admin' }, error: null }),
        }),
      }),
    }),
  }),
}))

describe('Admin users page', () => {
  it('does not offer a per-person Grok voice toggle', async () => {
    render(<UsersPage />)
    expect((await screen.findAllByText('pat@example.com')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('checkbox', { name: /grok voice/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/grok voice/i)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /make admin/i })).toBeInTheDocument())
  })
})
