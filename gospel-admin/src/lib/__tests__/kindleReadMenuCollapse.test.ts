/**
 * @jest-environment jsdom
 */

import {
  closeKindleReadMenuDetails,
  kindleReadMenuLinkFromClickTarget,
} from '@/lib/kindleReadMenuCollapse'

describe('kindleReadMenuCollapse', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('kindleReadMenuLinkFromClickTarget returns menu anchors with a real href', () => {
    document.body.innerHTML = `
      <details class="kindle-read-menu" open>
        <summary>Menu</summary>
        <div class="kindle-read-menu-body">
          <a href="#section-1">Section</a>
          <a href="#">Skip</a>
        </div>
      </details>
    `
    const sectionLink = document.querySelector('a[href="#section-1"]')!
    expect(kindleReadMenuLinkFromClickTarget(sectionLink)).toBe(sectionLink)
    expect(kindleReadMenuLinkFromClickTarget(document.querySelector('a[href="#"]'))).toBeNull()
    expect(kindleReadMenuLinkFromClickTarget(document.querySelector('summary'))).toBeNull()
  })

  it('closeKindleReadMenuDetails closes the outer menu and nested sections', () => {
    document.body.innerHTML = `
      <details class="kindle-read-menu" open>
        <summary>Menu</summary>
        <div class="kindle-read-menu-body">
          <details class="kindle-read-menu-section" open>
            <summary>Table of Contents</summary>
            <details class="kindle-read-toc-section" open>
              <summary>Section</summary>
              <a href="#section-1">Go</a>
            </details>
          </details>
        </div>
      </details>
    `
    const menu = document.querySelector('.kindle-read-menu')!
    closeKindleReadMenuDetails(menu)
    expect(document.querySelector('.kindle-read-menu')?.hasAttribute('open')).toBe(false)
    expect(menu.querySelectorAll('details[open]')).toHaveLength(0)
  })
})
