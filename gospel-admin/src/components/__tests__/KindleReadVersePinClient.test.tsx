/**
 * @jest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react'
import KindleReadVersePinClient from '@/components/KindleReadVersePinClient'
import { loadKindleReadLastCard } from '@/lib/kindleReadLastCardStorage'

const mockPathname = jest.fn(() => '/mchy/read/')
const mockSearchParams = jest.fn(() => new URLSearchParams())

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}))

describe('KindleReadVersePinClient', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPathname.mockReturnValue('/mchy/read/')
    mockSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('highlights the saved last card on profile read pages', async () => {
    localStorage.setItem(
      'kindle-read-last-card-mchy',
      JSON.stringify({
        v: 1,
        reference: 'John 3:16',
        sectionId: 'section-jan',
        subsectionId: 'section-jan-0-1',
      })
    )

    document.body.innerHTML = `
      <span id="section-jan-0-1-card-0" class="kindle-read-scripture-card">
        <a class="kindle-read-scripture-link" href="#">John 3:16</a>
      </span>
    `

    render(<KindleReadVersePinClient />)

    await waitFor(() => {
      expect(document.getElementById('section-jan-0-1-card-0')).toHaveClass(
        'kindle-read-scripture-card--yellow-pin'
      )
    })
  })

  it('saves last card when opening scripture from a card', async () => {
    mockPathname.mockReturnValue('/read/scripture/')
    mockSearchParams.mockReturnValue(
      new URLSearchParams({
        from: 'mchy',
        ref: 'Genesis 1',
        anchor: 'section-jan-0-1-card-0',
      })
    )

    render(<KindleReadVersePinClient />)

    await waitFor(() => {
      expect(loadKindleReadLastCard('mchy')?.reference).toBe('Genesis 1')
    })
  })
})
