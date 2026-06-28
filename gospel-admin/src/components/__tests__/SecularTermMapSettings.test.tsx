/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SecularTermMapSettings from '@/components/SecularTermMapSettings'
import { AlertModalProvider } from '@/contexts/AlertModalContext'

jest.mock('@/components/RichTextEditor', () => {
  return function MockRichTextEditor({
    value,
    onChange,
  }: {
    value: string
    onChange: (v: string) => void
  }) {
    return (
      <textarea
        aria-label="Intro editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
})

const sampleResponse = {
  map: {
    pinnedSectionTitle: 'Find your topic (secular terms)',
    introHtml: '<p>Intro</p>',
    mappings: [
      {
        secularTerms: ['self-esteem'],
        biblicalTopic: 'Pride and Humility',
      },
    ],
  },
  sectionTitles: ['Pride and Humility', 'Anxiety and Worry'],
}

function renderSettings() {
  return render(
    <AlertModalProvider>
      <SecularTermMapSettings />
    </AlertModalProvider>
  )
}

describe('SecularTermMapSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('expands and lazy-loads map on first open', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => sampleResponse,
    })

    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: /Secular term map/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/biblical-counseling/secular-term-map',
        { cache: 'no-store' }
      )
    })

    expect(await screen.findByDisplayValue('self-esteem')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /biblical topic/i })).toHaveValue('Pride and Humility')
  })

  it('adds a mapping row with biblical topic select', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...sampleResponse,
        map: { ...sampleResponse.map, mappings: [] },
      }),
    })

    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: /Secular term map/i }))
    await screen.findByText(/No mappings yet/i)

    fireEvent.click(screen.getByRole('button', { name: /Add mapping row/i }))

    const topicSelect = screen.getByRole('combobox', { name: /biblical topic/i })
    fireEvent.change(topicSelect, { target: { value: 'Anxiety and Worry' } })
    expect(topicSelect).toHaveValue('Anxiety and Worry')
  })

  it('sends PUT payload on Save map', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResponse })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...sampleResponse, success: true, validationIssues: [] }),
      })

    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: /Secular term map/i }))
    await screen.findByDisplayValue('self-esteem')

    fireEvent.click(screen.getByRole('button', { name: /Save map/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/biblical-counseling/secular-term-map',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    const putCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[1]?.method === 'PUT'
    )
    const body = JSON.parse(putCall[1].body as string)
    expect(body.map.mappings[0].biblicalTopic).toBe('Pride and Humility')
  })

  it('POST apply to test profile without confirm', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResponse })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, validationIssues: [] }),
      })

    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: /Secular term map/i }))
    await screen.findByDisplayValue('self-esteem')

    fireEvent.click(screen.getByRole('button', { name: /Apply to test profile/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/biblical-counseling/secular-term-map/apply',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
