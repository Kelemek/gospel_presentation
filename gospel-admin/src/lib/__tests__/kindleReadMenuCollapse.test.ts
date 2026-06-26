/**
 * @jest-environment jsdom
 */

import {
  closeKindleReadMenuDetails,
  closeKindleReadProfileMenu,
  kindleReadMenuLinkFromClickTarget,
} from '@/lib/kindleReadMenuCollapse'
import { KINDLE_READ_ROOT_MENU_OPEN_CLASS } from '@/lib/kindleReadMenuModeScript'

describe('kindleReadMenuCollapse', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('kindleReadMenuLinkFromClickTarget returns menu panel anchors with a real href', () => {
    document.body.innerHTML = `
      <div class="kindle-read-root">
        <button type="button" class="kindle-read-menu-trigger-btn" aria-expanded="true">Menu</button>
        <div class="kindle-read-menu-panel">
          <div class="kindle-read-menu-body">
            <a href="#section-1">Section</a>
            <a href="#">Skip</a>
          </div>
        </div>
      </div>
    `
    const sectionLink = document.querySelector('a[href="#section-1"]')!
    expect(kindleReadMenuLinkFromClickTarget(sectionLink)).toBe(sectionLink)
    expect(kindleReadMenuLinkFromClickTarget(document.querySelector('a[href="#"]'))).toBeNull()
    expect(kindleReadMenuLinkFromClickTarget(document.querySelector('button'))).toBeNull()
  })

  it('closeKindleReadMenuDetails closes nested sections inside a menu container', () => {
    document.body.innerHTML = `
      <div class="kindle-read-menu-panel">
        <div class="kindle-read-menu-body">
          <details class="kindle-read-menu-section" open>
            <summary>Table of Contents</summary>
            <details class="kindle-read-toc-section" open>
              <summary>Section</summary>
              <a href="#section-1">Go</a>
            </details>
          </details>
        </div>
      </div>
    `
    const panel = document.querySelector('.kindle-read-menu-panel')!
    closeKindleReadMenuDetails(panel)
    expect(panel.querySelectorAll('details[open]')).toHaveLength(0)
  })

  it('closeKindleReadProfileMenu closes the trigger and nested sections', () => {
    document.body.innerHTML = `
      <div class="kindle-read-root ${KINDLE_READ_ROOT_MENU_OPEN_CLASS}">
        <button type="button" class="kindle-read-menu-trigger-btn" aria-expanded="true">Menu</button>
        <div class="kindle-read-menu-panel">
          <div class="kindle-read-menu-body">
            <details class="kindle-read-menu-section" open>
              <summary>Table of Contents</summary>
              <a href="#section-1">Go</a>
            </details>
          </div>
        </div>
      </div>
    `
    closeKindleReadProfileMenu()
    expect(document.querySelector('.kindle-read-root')?.classList.contains(KINDLE_READ_ROOT_MENU_OPEN_CLASS)).toBe(false)
    expect(document.querySelector('.kindle-read-menu-trigger-btn')?.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelectorAll('details[open]')).toHaveLength(0)
  })
})
