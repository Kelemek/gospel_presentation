/**
 * @jest-environment jsdom
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import KindleReadMenuCollapse from '@/components/KindleReadMenuCollapse'

describe('KindleReadMenuCollapse', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('collapses open menu details when a menu link is clicked', async () => {
    document.body.innerHTML = `
      <details class="kindle-read-menu" open>
        <summary>Menu</summary>
        <div class="kindle-read-menu-body">
          <details class="kindle-read-menu-section" open>
            <summary>Table of Contents</summary>
            <a href="#section-1">The Problem</a>
          </details>
        </div>
      </details>
    `

    render(<KindleReadMenuCollapse />)

    const link = document.querySelector('a[href="#section-1"]')!
    fireEvent.click(link)

    await waitFor(() => {
      expect(document.querySelectorAll('details[open]')).toHaveLength(0)
    })
  })
})
