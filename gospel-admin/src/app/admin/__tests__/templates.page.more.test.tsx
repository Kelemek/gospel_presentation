import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Prefer mocking the small auth helper that the hoisted supabase createClient
// checks first. This avoids relying on the mocked localStorage shape.
jest.mock('@/lib/auth', () => ({
  isAuthenticated: () => true,
}))

describe('TemplatesPageContent - additional branches', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    // restore default fetch behavior provided by jest.setup.js
    ;(global.fetch as jest.Mock).mockReset()
  })

  test('renders template list and shows "Never visited" for zero visits', async () => {
    const profiles = [{
      id: '1', slug: 'template-1', title: 'Template One', isTemplate: true,
      visitCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastVisited: null,
      ownerDisplayName: 'Owner', description: 'desc', isDefault: false
    }]

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (/\/api\/profiles(?:\?.*)?$/.test(url)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    // wait for template title to appear
    expect(await screen.findByText('Template One')).toBeInTheDocument()
    // Never visited label should be shown for visitCount === 0
    expect(screen.getByText('Never visited')).toBeInTheDocument()
  // Owner display shown (may appear in multiple elements)
  expect(screen.getAllByText(/Owner/).length).toBeGreaterThan(0)
  })

  test('copy/share button writes URL to clipboard and shows alert', async () => {
    const profiles = [{
      id: '2', slug: 't-copy', title: 'Copy Me', isTemplate: true,
      visitCount: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastVisited: null,
      ownerDisplayName: '', description: '', isDefault: false
    }]

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (/\/api\/profiles(?:\?.*)?$/.test(url)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ slug: 't-copy', title: 'Copy Me' }) })
    })

    const writeMock = jest.fn().mockResolvedValue(undefined)
    // @ts-ignore - add clipboard mock
    global.navigator.clipboard = { writeText: writeMock }

    const alertSpy = jest.spyOn(global, 'alert')

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    expect(await screen.findByText('Copy Me')).toBeInTheDocument()

    const share = screen.getByRole('button', { name: /Share/i })
    fireEvent.click(share)

    await waitFor(() => expect(writeMock).toHaveBeenCalled())
    expect(alertSpy).toHaveBeenCalled()
  })

  test('delete flow removes template when confirmed', async () => {
    const profiles = [{
      id: '3', slug: 't-del', title: 'Delete Me', isTemplate: true,
      visitCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastVisited: new Date().toISOString(),
      ownerDisplayName: '', description: '', isDefault: false
    }]

    // initial list and DELETE
    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.match(/\/api\/profiles(?:\?.*)?$/)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles }) })
      }

      // DELETE
      if (opts && opts.method === 'DELETE') {
        return Promise.resolve({ ok: true })
      }

      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    // confirm true
    jest.spyOn(window, 'confirm').mockImplementation(() => true)
    const alertSpy = jest.spyOn(global, 'alert')

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    expect(await screen.findByText('Delete Me')).toBeInTheDocument()

    // Delete button should exist for admin role
    const delBtn = screen.getByRole('button', { name: /Delete/i })
    fireEvent.click(delBtn)

    await waitFor(() => expect(alertSpy).toHaveBeenCalled())
    // After delete, the template title should no longer be in the document
    await waitFor(() => expect(screen.queryByText('Delete Me')).not.toBeInTheDocument())
  })

  test('download backup triggers blob URL creation', async () => {
    const profiles = [{
      id: '4', slug: 't-dl', title: 'Download Me', isTemplate: true,
      visitCount: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastVisited: null,
      ownerDisplayName: '', description: '', isDefault: false
    }]

    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.match(/\/api\/profiles(?:\?.*)?$/)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles }) })
      }

      // fetch profile detail
      if (url.match(/\/api\/profiles\/t-dl(?:\?.*)?$/)) {
        return Promise.resolve({ ok: true, json: async () => ({ slug: 't-dl', title: 'Download Me', description: '', isDefault: false, isTemplate: true, gospelData: [], visitCount: 2, lastVisited: null }) })
      }

      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

  // jsdom may not implement createObjectURL; provide test stubs
  ;(global.URL as any).createObjectURL = jest.fn().mockReturnValue('blob:mock')
  ;(global.URL as any).revokeObjectURL = jest.fn()

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    expect(await screen.findByText('Download Me')).toBeInTheDocument()

    const dl = screen.getByRole('button', { name: /Download Backup/i })
    fireEvent.click(dl)

    await waitFor(() => expect((global.URL as any).createObjectURL).toHaveBeenCalled())
    expect((global.URL as any).revokeObjectURL).toHaveBeenCalled()
  })
})
