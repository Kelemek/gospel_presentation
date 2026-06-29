import {
  renderKindleReadMenuHtml,
  renderKindleReadMenuNavHtml,
  renderKindleReadMenuPanelHtml,
  renderKindleReadMenuTriggerHtml,
} from '@/lib/kindleReadMenu'
import type { EnabledTranslationOption } from '@/lib/enabledTranslationCodes'
import type { GospelPresentationData } from '@/lib/types'
import type { PublicResourceItem } from '@/lib/supabase-data-service'

const sampleSections: GospelPresentationData = [
  {
    section: '1',
    title: 'The Problem',
    subsections: [
      {
        title: 'Sin and judgment',
        content: '<p>See Romans 3:23.</p>',
      },
    ],
  },
]

const sampleItems: PublicResourceItem[] = [
  { type: 'template', slug: 'default', title: 'The Gospel in its Context' },
  { type: 'spurgeonLibrary', title: 'Spurgeon sermons' },
]

const sampleTranslations: EnabledTranslationOption[] = [
  { translation_code: 'esv', translation_name: 'ESV (English Standard Version)' },
  { translation_code: 'kjv', translation_name: 'KJV (King James Version)' },
]

describe('renderKindleReadMenuNavHtml', () => {
  it('renders split trigger and panel with Resources, Bible Translation, Text size, then Table of Contents', () => {
    const html = renderKindleReadMenuNavHtml(
      sampleItems,
      sampleSections,
      'default',
      sampleTranslations,
      'esv',
      'normal'
    )
    expect(html).toContain('kindle-read-menu-trigger-btn')
    expect(html).toContain('aria-controls="kindle-read-menu-panel"')
    expect(html).toContain('>Menu</button>')
    expect(html).toContain('id="kindle-read-menu-panel"')
    expect(html).toContain('<summary class="kindle-read-menu-section-title">Search</summary>')
    expect(html).toContain('kindle-read-resource-search')
    expect(html).toContain('<details class="kindle-read-menu-section">')
    expect(html.indexOf('<summary class="kindle-read-menu-section-title">Search</summary>')).toBeLessThan(
      html.indexOf('<summary class="kindle-read-menu-section-title">Resources</summary>')
    )
    expect(html.indexOf('<summary class="kindle-read-menu-section-title">Resources</summary>')).toBeLessThan(
      html.indexOf('<summary class="kindle-read-menu-section-title">Bible Translation</summary>')
    )
    expect(html.indexOf('<summary class="kindle-read-menu-section-title">Bible Translation</summary>')).toBeLessThan(
      html.indexOf('<summary class="kindle-read-menu-section-title">Text size</summary>')
    )
    expect(html.indexOf('<summary class="kindle-read-menu-section-title">Text size</summary>')).toBeLessThan(
      html.indexOf('<summary class="kindle-read-menu-section-title">Table of Contents</summary>')
    )
    expect(html).toContain('kindle-read-translation-option--current')
    expect(html).toContain('href="/default/read/?translation=kjv"')
    expect(html).toContain('href="/default/read/?textSize=larger"')
    expect(html).not.toMatch(/<details[^>]*\sopen/)
    expect(html).toContain('/default/read/')
    expect(html).toContain('/read/libraries/spurgeon/')
    expect(html).toContain('href="#section-1"')
    expect(html).toContain('The Problem')
  })

  it('returns empty string when there are no resources, sections, or translation choices', () => {
    expect(renderKindleReadMenuNavHtml([], [], 'default', sampleTranslations, 'esv', 'normal')).not.toBe('')
    expect(
      renderKindleReadMenuNavHtml(
        [],
        [],
        'default',
        [{ translation_code: 'esv', translation_name: 'ESV (English Standard Version)' }],
        'esv',
        'normal'
      )
    ).not.toBe('')
  })

  it('renders TOC-only menu when resources are empty', () => {
    const html = renderKindleReadMenuNavHtml([], sampleSections, 'default', sampleTranslations, 'kjv', 'larger')
    expect(html).toContain('Table of Contents')
    expect(html).not.toContain('<summary class="kindle-read-menu-section-title">Resources</summary>')
    expect(html).toContain('href="/default/read/?translation=esv&amp;textSize=larger"')
    expect(html).toContain('href="/default/read/?textSize=normal&amp;translation=kjv"')
  })

  it('omits Bible Translation section when only ESV is enabled', () => {
    const html = renderKindleReadMenuNavHtml(
      sampleItems,
      sampleSections,
      'default',
      [{ translation_code: 'esv', translation_name: 'ESV (English Standard Version)' }],
      'esv',
      'normal'
    )
    expect(html).not.toContain('<summary class="kindle-read-menu-section-title">Bible Translation</summary>')
    expect(html).toContain('<summary class="kindle-read-menu-section-title">Text size</summary>')
  })
})

describe('renderKindleReadMenuHtml', () => {
  it('returns trigger and panel parts for profile read pages', () => {
    const parts = renderKindleReadMenuHtml(
      sampleItems,
      sampleSections,
      'default',
      sampleTranslations,
      'esv',
      'normal'
    )
    expect(parts).not.toBeNull()
    expect(parts?.triggerHtml).toBe(renderKindleReadMenuTriggerHtml())
    expect(parts?.panelHtml).toContain('kindle-read-menu-panel')
    expect(parts?.panelHtml).toContain('Table of Contents')
    expect(parts?.panelHtml).toContain('Search this resource')
  })

  it('prefills the search form when searchQuery is provided', () => {
    const parts = renderKindleReadMenuHtml(
      sampleItems,
      sampleSections,
      'default',
      sampleTranslations,
      'esv',
      'normal',
      'anxiety'
    )
    expect(parts?.panelHtml).toContain('value="anxiety"')
  })

  it('returns menu parts with text size when profile has no resources or sections', () => {
    const parts = renderKindleReadMenuHtml(
      [],
      [],
      'default',
      [{ translation_code: 'esv', translation_name: 'ESV (English Standard Version)' }],
      'esv',
      'normal'
    )
    expect(parts).not.toBeNull()
    expect(parts?.panelHtml).toContain('Text size')
  })

  it('renderKindleReadMenuPanelHtml returns empty string for empty body', () => {
    expect(renderKindleReadMenuPanelHtml('')).toBe('')
  })
})
