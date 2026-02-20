import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TranslationSettings from '../TranslationSettings'

describe('TranslationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn()
  })

  it('loads settings and ESV count then shows panel', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('esv-cache-count')) return Promise.resolve({ ok: true, json: async () => ({ count: 5, totalVerses: 100, withinLimit: true }) })
      if (url.includes('translation-settings')) return Promise.resolve({ ok: true, json: async () => ({ settings: [{ translation_code: 'esv', translation_name: 'ESV', is_enabled: true, display_order: 1 }] }) })
      return Promise.resolve({ ok: false })
    })
    render(<TranslationSettings />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.getByText(/Translation|Settings|ESV/i)).toBeInTheDocument()
  })

  it('handles load errors and still shows UI', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('esv-cache-count')) return Promise.reject(new Error('net'))
      if (url.includes('translation-settings')) return Promise.resolve({ ok: true, json: async () => ({ settings: [] }) })
      return Promise.resolve({ ok: false })
    })
    render(<TranslationSettings />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
  })

  it('opens dropdown and toggles LSB; shows alert on PUT failure', async () => {
    const { showAlert } = (global as any).__alertModalMocks
    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('esv-cache-count')) return Promise.resolve({ ok: true, json: async () => ({ count: 0, totalVerses: 0, withinLimit: true }) })
      if (url.includes('translation-settings') && opts?.method === 'PUT') return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) })
      if (url.includes('translation-settings')) return Promise.resolve({ ok: true, json: async () => ({ settings: [{ translation_code: 'esv', translation_name: 'ESV', is_enabled: true, display_order: 1 }, { translation_code: 'lsb', translation_name: 'LSB', is_enabled: true, display_order: 2 }] }) })
      return Promise.resolve({ ok: false })
    })
    render(<TranslationSettings />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Translations/i }))
    const lsbToggle = screen.getByTitle('Toggle LSB')
    await userEvent.click(lsbToggle)
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('Forbidden'))
  })

  it('updates local state when PUT succeeds', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('esv-cache-count')) return Promise.resolve({ ok: true, json: async () => ({ count: 0, totalVerses: 0, withinLimit: true }) })
      if (url.includes('translation-settings') && opts?.method === 'PUT') return Promise.resolve({ ok: true })
      if (url.includes('translation-settings')) return Promise.resolve({ ok: true, json: async () => ({ settings: [{ translation_code: 'esv', translation_name: 'ESV', is_enabled: true, display_order: 1 }, { translation_code: 'lsb', translation_name: 'LSB', is_enabled: true, display_order: 2 }] }) })
      return Promise.resolve({ ok: false })
    })
    render(<TranslationSettings />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Translations/i }))
    await userEvent.click(screen.getByTitle('Toggle LSB'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/admin/translation-settings', expect.objectContaining({ method: 'PUT' })))
  })
})
