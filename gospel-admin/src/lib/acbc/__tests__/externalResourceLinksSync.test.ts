import {
  normalizeAcbcResourceUrl,
  parseAcbcResourceLinksFromHtml,
  reconcileExternalResourceLinks,
  addMissingAcbcSections,
  sectionTitleExists,
  createSectionForAcbcTopic,
  clearAcbcLinkSectionBody,
} from '@/lib/acbc/externalResourceLinksSync'
import type { GospelSection } from '@/lib/types'

describe('externalResourceLinksSync', () => {
  it('normalizes ACBC resource URLs with trailing slash', () => {
    expect(normalizeAcbcResourceUrl('https://biblicalcounseling.com/resource-library/articles/foo')).toBe(
      'https://biblicalcounseling.com/resource-library/articles/foo/'
    )
    expect(normalizeAcbcResourceUrl('https://biblicalcounseling.com/resource-library/articles/foo/')).toBe(
      'https://biblicalcounseling.com/resource-library/articles/foo/'
    )
  })

  it('parses h3 resource links from topic index HTML', () => {
    const html = `
      <h3><a href="https://biblicalcounseling.com/resource-library/articles/test-article/">Test Article</a></h3>
      <h3><a href="https://biblicalcounseling.com/resource-library/podcast-episodes/test-pod/">Test Pod</a></h3>
    `
    const links = parseAcbcResourceLinksFromHtml(html)
    expect(links).toHaveLength(2)
    expect(links[0].label).toBe('Test Article')
    expect(links[0].url).toContain('/articles/test-article/')
  })

  it('reconcile replaces list with fetched and reports added/removed', () => {
    const existing = [
      { label: 'Old', url: 'https://biblicalcounseling.com/resource-library/articles/removed/' },
      { label: 'Keep', url: 'https://biblicalcounseling.com/resource-library/articles/keep/' },
    ]
    const fetched = [
      { label: 'Keep updated', url: 'https://biblicalcounseling.com/resource-library/articles/keep/' },
      { label: 'New', url: 'https://biblicalcounseling.com/resource-library/articles/new/' },
    ]
    const { links, added, removed } = reconcileExternalResourceLinks(existing, fetched)
    expect(links).toHaveLength(2)
    expect(links[0].label).toBe('Keep updated')
    expect(added).toBe(1)
    expect(removed).toBe(1)
  })

  it('createSectionForAcbcTopic has no placeholder body text', () => {
    const section = createSectionForAcbcTopic('Abuse')
    expect(section.subsections[0]?.content).toBe('')
  })

  it('clearAcbcLinkSectionBody removes intro paragraphs from link-hub subsections', () => {
    const sub = { content: '<p>Passages on casting care on God and peace.</p>' }
    clearAcbcLinkSectionBody(sub)
    expect(sub.content).toBe('')
  })

  it('addMissingAcbcSections skips existing titles and renumbers', () => {
    const data: GospelSection[] = [
      {
        section: '1',
        title: 'Abuse',
        subsections: [{ title: '', content: '<p>x</p>' }],
      },
    ]
    const { added, skipped } = addMissingAcbcSections(data)
    expect(skipped).toContain('Abuse')
    expect(added.length).toBeGreaterThan(0)
    expect(data[0].section).toBe('1')
    expect(data[data.length - 1].section).toBe(String(data.length))
    expect(sectionTitleExists(data, 'Church')).toBe(true)
  })
})
