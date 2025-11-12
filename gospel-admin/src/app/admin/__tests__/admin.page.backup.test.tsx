import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation hooks used by AdminHeader and AdminPageContent
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/admin'
}))

// Mock createClient from supabase client
const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  auth_signOut: jest.fn()
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

import { AdminPageContent } from '../page'

describe('AdminPageContent backup/restore flows', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Default supabase auth.getUser -> logged-in user
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    // user_profiles select -> role admin
    mockFrom.mockImplementation(() => mockSupabase)
    mockSelect.mockImplementation(() => mockSupabase)
    mockEq.mockImplementation(() => mockSupabase)
    mockSingle.mockResolvedValue({ data: { role: 'admin' } })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('downloads a profile backup when Download Backup is clicked', async () => {
    const slug = 'dl-slug'
    const profile = { id: 'p1', slug, title: 'DL', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }

    // initial GET /api/profiles -> returns profile
    // GET /api/profiles/:slug -> returns full profile with gospelData
    // Use mockImplementationOnce sequence
    // @ts-ignore
    global.fetch = jest.fn((url, opts) => {
      // initial profiles list
      if (url === '/api/profiles') return Promise.resolve({ ok: true, json: async () => ({ profiles: [profile] }) })

      // fetch full profile by slug (download flow)
      if (typeof url === 'string' && url.startsWith(`/api/profiles/${slug}`)) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: { ...profile, gospelData: [{ id: 'g1' }] } }) })
      }

      // default safe response for any other API calls
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    // Spy on URL.createObjectURL and revoke
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    // @ts-ignore
    URL.createObjectURL = jest.fn(() => 'blob:fake')
    // @ts-ignore
    URL.revokeObjectURL = jest.fn()

    // Spy on anchor click
    const origCreateElement = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      const el = origCreateElement(tagName)
      if (tagName === 'a') {
        jest.spyOn(el, 'click').mockImplementation(() => {})
      }
      return el
    })

    const user = userEvent.setup()
    render(<AdminPageContent />)

    const btn = await screen.findByRole('button', { name: /Download Backup/i })
    await user.click(btn)

    // Wait for the download flow to call createObjectURL and revoke
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
    expect(URL.revokeObjectURL).toHaveBeenCalled()

    // restore originals
    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
  })

  it('restores a profile from a valid backup file', async () => {
    const slug = 'restore-slug'
    const profile = { id: 'p2', slug, title: 'RestoreMe', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }

    // initial GET -> returns profile list
    // PUT /api/profiles/:slug -> ok
    // subsequent GET -> returns same (simulate refresh)
    // @ts-ignore
    global.fetch = jest.fn()
      .mockImplementationOnce((url, opts) => {
        if (url === '/api/profiles') return Promise.resolve({ ok: true, json: async () => ({ profiles: [profile] }) })
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      .mockImplementationOnce((url, opts) => {
        // PUT handler
        if (typeof url === 'string' && url.startsWith(`/api/profiles/${slug}`) && opts && opts.method === 'PUT') {
          return Promise.resolve({ ok: true, json: async () => ({}) })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      .mockImplementationOnce((url, opts) => {
        if (url === '/api/profiles') return Promise.resolve({ ok: true, json: async () => ({ profiles: [profile] }) })
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

    // Mock confirm and alert
    // @ts-ignore
    window.confirm = jest.fn(() => true)
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    const user = userEvent.setup()
    render(<AdminPageContent />)

    // Find the restore input for the profile by label "Upload & Restore" (label wraps input)
    const fileInput = await screen.findByLabelText(/Upload & Restore/i) as HTMLInputElement

    // Create a valid backup file (new format with profile and gospelData)
    const backup = { profile: { title: 'Restored', description: 'x', gospelData: [{ id: 'g1' }], lastViewedScripture: null } }
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })

    await user.upload(fileInput, file)

    // Wait for alert to be called with success message
    await waitFor(() => expect(alertSpy).toHaveBeenCalled())

    alertSpy.mockRestore()
  })

  it('shows an alert when restoring an invalid backup file', async () => {
    const slug = 'restore-slug'
    const profile = { id: 'p3', slug, title: 'BadRestore', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }

    // initial GET -> returns profile list
    // @ts-ignore
    global.fetch = jest.fn().mockImplementation((url, opts) => {
      if (url === '/api/profiles') return Promise.resolve({ ok: true, json: async () => ({ profiles: [profile] }) })
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    // Mock confirm and alert
    // @ts-ignore
    window.confirm = jest.fn(() => true)
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    const user = userEvent.setup()
    render(<AdminPageContent />)

    const fileInput = await screen.findByLabelText(/Upload & Restore/i) as HTMLInputElement

    // Create an invalid backup file (missing gospelData/profile)
    const bad = { notProfile: true }
    const file = new File([JSON.stringify(bad)], 'bad.json', { type: 'application/json' })

    await user.upload(fileInput, file)

    await waitFor(() => expect(alertSpy).toHaveBeenCalled())

    alertSpy.mockRestore()
  })
})
