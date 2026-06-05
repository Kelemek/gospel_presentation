import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExternalLinksEditorBlock from '../ExternalLinksEditorBlock'

describe('ExternalLinksEditorBlock', () => {
  it('adds a link with normalized https URL', async () => {
    const user = userEvent.setup()
    const onLinksChange = jest.fn()

    render(
      <ExternalLinksEditorBlock
        locationId="0-0"
        links={[]}
        onLinksChange={onLinksChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /add link/i }))
    await user.type(screen.getByPlaceholderText(/link label/i), 'ACBC: Worry')
    await user.type(
      screen.getByPlaceholderText(/biblicalcounseling/i),
      'biblicalcounseling.com/topic/worry/'
    )
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(onLinksChange).toHaveBeenCalledWith([
      {
        label: 'ACBC: Worry',
        url: 'https://biblicalcounseling.com/topic/worry/',
      },
    ])
  })

  it('removes a link', async () => {
    const user = userEvent.setup()
    const onLinksChange = jest.fn()

    render(
      <ExternalLinksEditorBlock
        locationId="0-0"
        links={[{ label: 'ACBC', url: 'https://example.com' }]}
        onLinksChange={onLinksChange}
      />
    )

    await user.click(screen.getByTitle('Remove link'))
    expect(onLinksChange).toHaveBeenCalledWith([])
  })
})
