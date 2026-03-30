import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportsPage from '../page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (typeof URL !== 'undefined' && input instanceof URL) return input.href
  return (input as Request).url
}

function mockFetchHandlers() {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input)
    if (url.includes('scripture-cache-stats')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          translations: {
            esv: { count: 2, totalVerses: 10, verseLimit: 500, withinLimit: true },
            niv: { count: 1, totalVerses: 5, verseLimit: 500, withinLimit: true },
            nlt: { count: 0, totalVerses: 0, verseLimit: 500, withinLimit: true },
            csb: { count: 0, totalVerses: 0, verseLimit: 500, withinLimit: true },
          },
        }),
      })
    }
    if (url.includes('api/admin/reports') && init?.method === 'POST') {
      const body = JSON.parse((init.body as string) || '{}')
      if (body.reportType === 'get_translations') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ translations: ['esv'] }),
        })
      }
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  }
}

describe('ReportsPage scripture cache section', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn(mockFetchHandlers())
  })

  it('loads and displays per-translation cache stats', async () => {
    render(<ReportsPage />)
    await waitFor(() => {
      expect(screen.getByText('ESV')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/References:/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Verses cached: 10\/500/)).toBeInTheDocument()
    expect(screen.getByText(/NIV \(API\.Bible\)/)).toBeInTheDocument()
    expect(screen.getByText(/Verses cached: 5\/500/)).toBeInTheDocument()
  })

  it('refreshes cache stats when Refresh is clicked', async () => {
    render(<ReportsPage />)
    await waitFor(() => expect(screen.getByText('ESV')).toBeInTheDocument())
    const refresh = screen.getByRole('button', { name: /^Refresh$/i })
    await userEvent.click(refresh)
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string)
      const cacheCalls = calls.filter((u) => u.includes('scripture-cache-stats'))
      expect(cacheCalls.length).toBeGreaterThanOrEqual(2)
    })
  })
})
