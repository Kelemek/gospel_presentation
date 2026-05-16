import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { TemplatesListPanel } from './TemplatesListPanel'

jest.mock('@/hooks/useViewPreference', () => ({
  useViewPreference: jest.fn(() => ['list' as const, jest.fn()]),
}))

describe('TemplatesListPanel', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/api/profiles/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profiles: [], total: 0, totalPages: 1 }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('refetches templates when listRefreshKey increments', async () => {
    const { rerender } = render(
      <TemplatesListPanel authReady userRole="admin" embedded listRefreshKey={0} />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const templateCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('/api/profiles/templates')
    )
    const countAfterMount = templateCalls.length

    rerender(
      <TemplatesListPanel authReady userRole="admin" embedded listRefreshKey={1} />
    )

    await waitFor(() => {
      const next = (global.fetch as jest.Mock).mock.calls.filter(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('/api/profiles/templates')
      )
      expect(next.length).toBeGreaterThan(countAfterMount)
    })
  })
})
