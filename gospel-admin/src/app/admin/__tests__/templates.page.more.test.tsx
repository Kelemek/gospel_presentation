import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Prefer mocking the small auth helper that the hoisted supabase createClient
// checks first. This avoids relying on the mocked localStorage shape.
jest.mock('@/lib/auth', () => ({
  isAuthenticated: () => true,
}))

function paginatedTemplatesResponse(profiles: unknown[]) {
  const total = profiles.length
  return {
    profiles,
    total,
    page: 1,
    pageSize: 30,
    totalPages: Math.max(1, Math.ceil(total / 30) || 1),
  }
}

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
      if (typeof url === 'string' && url.includes('/api/profiles/templates')) {
        return Promise.resolve({ ok: true, json: async () => paginatedTemplatesResponse(profiles) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    // wait for template title to appear
    expect(await screen.findByText('Template One')).toBeInTheDocument()
    // Description should be visible
    expect(screen.getByText('desc')).toBeInTheDocument()
  
    // Expand details to see additional info
    const detailsButtons = screen.getAllByRole('button', { name: /Details/i })
    fireEvent.click(detailsButtons[0])
  
    // Now "Never visited" should be visible in expanded details
    await waitFor(() => expect(screen.getByText('Never visited')).toBeInTheDocument())
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
      if (typeof url === 'string' && url.includes('/api/profiles/templates')) {
        return Promise.resolve({ ok: true, json: async () => paginatedTemplatesResponse(profiles) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ slug: 't-copy', title: 'Copy Me' }) })
    })

    const writeMock = jest.fn().mockResolvedValue(undefined)
    // @ts-expect-error - add clipboard mock
    global.navigator.clipboard = { writeText: writeMock }
    delete (global.navigator as { share?: unknown }).share

    const { showAlert } = (global as any).__alertModalMocks

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    expect(await screen.findByText('Copy Me')).toBeInTheDocument()

    // Find and expand the template details to access the Copy URL button
    const detailsButtons = screen.getAllByRole('button', { name: /Details/i })
    const copyTemplateRow = screen.getByText('Copy Me').closest('tr') || screen.getByText('Copy Me').closest('div')
    const detailsButton = copyTemplateRow?.querySelector('button[aria-label*="Details"]') || detailsButtons[0]
    
    if (detailsButton) {
      fireEvent.click(detailsButton)
    }

    // Now the Copy URL button should be visible in the expanded details
    const copyButton = await screen.findByRole('button', { name: /Copy URL/i })
    fireEvent.click(copyButton)

    await waitFor(() => expect(writeMock).toHaveBeenCalled())
    expect(showAlert).toHaveBeenCalled()
  })

  test('delete flow removes template when confirmed', async () => {
    const profiles = [{
      id: '3', slug: 't-del', title: 'Delete Me', isTemplate: true,
      visitCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastVisited: new Date().toISOString(),
      ownerDisplayName: '', description: '', isDefault: false
    }]

    let templateRows = [...profiles]

    // initial list and DELETE
    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (typeof url === 'string' && url.includes('/api/profiles/templates')) {
        return Promise.resolve({ ok: true, json: async () => paginatedTemplatesResponse(templateRows) })
      }

      // DELETE
      if (opts && opts.method === 'DELETE') {
        templateRows = []
        return Promise.resolve({ ok: true })
      }

      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const { showAlert, showConfirm } = (global as any).__alertModalMocks
    showConfirm.mockImplementationOnce(() => Promise.resolve(true))

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    expect(await screen.findByText('Delete Me')).toBeInTheDocument()

    // Find and expand the template details to access the Delete button
    const detailsButtons = screen.getAllByRole('button', { name: /Details/i })
    const deleteTemplateRow = screen.getByText('Delete Me').closest('tr') || screen.getByText('Delete Me').closest('div')
    const detailsButton = deleteTemplateRow?.querySelector('button[aria-label*="Details"]') || detailsButtons[0]
    
    if (detailsButton) {
      fireEvent.click(detailsButton)
    }

    // Now the Delete button should be visible in the expanded details
    const delBtn = await screen.findByRole('button', { name: /Delete/i })
    fireEvent.click(delBtn)

    await waitFor(() => expect(showAlert).toHaveBeenCalled())
    // After delete, the template title should no longer be in the document
    await waitFor(() => expect(screen.queryByText('Delete Me')).not.toBeInTheDocument())
  })

  test('templates page renders correctly without backup buttons', async () => {
    const profiles = [{
      id: '4', slug: 't-no-backup', title: 'No Backup Buttons', isTemplate: true,
      visitCount: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastVisited: null,
      ownerDisplayName: '', description: '', isDefault: false
    }]

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/profiles/templates')) {
        return Promise.resolve({ ok: true, json: async () => paginatedTemplatesResponse(profiles) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const mod = await import('@/app/admin/templates/page')
    const { TemplatesPageContent } = mod

    render(<TemplatesPageContent />)

    // Verify template is rendered
    expect(await screen.findByText('No Backup Buttons')).toBeInTheDocument()
    // Backup/restore buttons should NOT be in the list/card views (they're only in settings)
    expect(screen.queryByRole('button', { name: /Download Backup/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Restore/i })).not.toBeInTheDocument()
  })
})
