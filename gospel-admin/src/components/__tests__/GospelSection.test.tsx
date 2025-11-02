import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GospelSection from '../GospelSection'

describe('GospelSection TextWithComaButtons', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    // Mock fetch for ComaModal inside the section
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ template: { instructions: '<h1>Help</h1>' } }) } as any)
  })

  it('renders COMA button in subsection content and opens modal on click', async () => {
    const section = {
      section: 1,
      title: 'Test Section',
      subsections: [
        {
          title: 'Sub',
          content: 'This is a test mentioning COMA in the text.',
        }
      ]
    }

    render(<GospelSection section={section as any} onScriptureClick={() => {}} profileSlug="test" />)

    // The COMA text should be rendered as a button
    const comaButton = await screen.findByText(/COMA|C\.O\.M\.A\./i)
    expect(comaButton).toBeInTheDocument()

    // Click the button and expect modal title to appear
    fireEvent.click(comaButton)
    await waitFor(() => expect(screen.getByText(/C\.O\.M\.A\. Method/i)).toBeInTheDocument())
  })
})
