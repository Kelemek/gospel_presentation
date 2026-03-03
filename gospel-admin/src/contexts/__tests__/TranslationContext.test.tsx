'use client'

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.unmock('@/contexts/TranslationContext')
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: null } })
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { preferred_translation: 'esv' }, error: null }),
    }),
  })),
}))

import { TranslationProvider, useTranslation } from '@/contexts/TranslationContext'

function TestConsumer() {
  const { translation, setTranslation, isLoading, enabledTranslations } = useTranslation()
  return (
    <div>
      <span data-testid="translation">{translation}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="enabled">{enabledTranslations.join(',')}</span>
      <button type="button" onClick={() => setTranslation('kjv')}>Set KJV</button>
    </div>
  )
}

describe('TranslationContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    global.fetch = jest.fn()
  })

  it('throws when useTranslation is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useTranslation must be used within a TranslationProvider')
    consoleSpy.mockRestore()
  })

  it('loads enabled translations and provides default translation', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ translations: [{ translation_code: 'esv' }, { translation_code: 'lsb' }] }),
    })
    render(
      <TranslationProvider>
        <TestConsumer />
      </TranslationProvider>
    )
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('translation')).toHaveTextContent('esv')
    expect(screen.getByTestId('enabled')).toHaveTextContent('esv,lsb')
  })

  it('on fetch error falls back to esv for enabled translations', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    render(
      <TranslationProvider>
        <TestConsumer />
      </TranslationProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('enabled')).toHaveTextContent('esv')
  })

  it('setTranslation updates state and for anonymous user saves to localStorage', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ translations: [{ translation_code: 'esv' }, { translation_code: 'kjv' }] }) })
    render(
      <TranslationProvider>
        <TestConsumer />
      </TranslationProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    const user = userEvent.setup({ delay: null })
    await user.click(screen.getByRole('button', { name: /Set KJV/i }))
    await waitFor(() => expect(screen.getByTestId('translation')).toHaveTextContent('kjv'))
    expect(localStorage.getItem('gospel-preferred-translation')).toBe('kjv')
  })

  it('loads preferred translation from user profile when logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const { createClient } = require('@/lib/supabase/client')
    createClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { preferred_translation: 'lsb' }, error: null }),
      }),
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ translations: [{ translation_code: 'esv' }, { translation_code: 'lsb' }] }) })
    render(
      <TranslationProvider>
        <TestConsumer />
      </TranslationProvider>
    )
    await waitFor(() => expect(screen.getByTestId('translation')).toHaveTextContent('lsb'))
  })

  it('setTranslation with logged-in user saves to localStorage and calls API', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const { createClient } = require('@/lib/supabase/client')
    createClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { preferred_translation: 'esv' }, error: null }) }),
    })
    ;(global.fetch as jest.Mock).mockImplementation((url: string) =>
      url.includes('translations/enabled')
        ? Promise.resolve({ ok: true, json: async () => ({ translations: [{ translation_code: 'esv' }, { translation_code: 'nasb' }] }) })
        : Promise.resolve({ ok: false })
    )
    render(
      <TranslationProvider>
        <TestConsumer />
      </TranslationProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: /Set KJV/i }))
    await waitFor(() => expect(screen.getByTestId('translation')).toHaveTextContent('kjv'))
    expect(localStorage.getItem('gospel-preferred-translation')).toBe('kjv')
  })
})
