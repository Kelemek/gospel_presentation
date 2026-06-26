/**
 * @jest-environment jsdom
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import KindleReadMenuCollapse from '@/components/KindleReadMenuCollapse'
import { KINDLE_READ_ROOT_MENU_OPEN_CLASS } from '@/lib/kindleReadMenuModeScript'

describe('KindleReadMenuCollapse', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('collapses open menu when a menu panel link is clicked', async () => {
    document.body.innerHTML = `
      <div class="kindle-read-root ${KINDLE_READ_ROOT_MENU_OPEN_CLASS}">
        <button type="button" class="kindle-read-menu-trigger-btn" aria-expanded="true">Menu</button>
        <div class="kindle-read-menu-panel">
          <div class="kindle-read-menu-body">
            <details class="kindle-read-menu-section" open>
              <summary>Table of Contents</summary>
              <a href="#section-1">The Problem</a>
            </details>
          </div>
        </div>
      </div>
    `

    render(<KindleReadMenuCollapse />)

    const link = document.querySelector('a[href="#section-1"]')!
    fireEvent.click(link)

    await waitFor(() => {
      expect(document.querySelectorAll('details[open]')).toHaveLength(0)
      expect(document.querySelector('.kindle-read-root')?.classList.contains(KINDLE_READ_ROOT_MENU_OPEN_CLASS)).toBe(false)
    })
  })
})
