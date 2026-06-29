import {
  kindleProfileReadUrl,
  kindleScriptureReadUrl,
  linkifyScriptureInBodyHtmlForKindleRead,
  linkifyScriptureInHtmlForKindleRead,
  renderKindleReadArticleHtml,
  renderKindleReadTocNavHtml,
} from '@/lib/kindleReadHtml'
import type { GospelPresentationData } from '@/lib/types'

const sampleSections: GospelPresentationData = [
  {
    section: '1',
    title: 'The Problem',
    subsections: [
      {
        title: 'Sin and judgment',
        content: '<p>See Romans 3:23 for the universal problem.</p>',
        scriptureReferences: [{ reference: 'John 3:16', text: 'For God so loved the world…' }],
        nestedSubsections: [
          {
            title: 'Nested point',
            content: '<p>Galatians 2:20 in the body.</p>',
          },
        ],
      },
    ],
  },
]

describe('kindleReadHtml', () => {
  it('builds scripture and profile read urls', () => {
    expect(kindleScriptureReadUrl('Romans 8:28', 'default')).toBe(
      '/read/scripture/?ref=Romans+8%3A28&from=default'
    )
    expect(kindleScriptureReadUrl('Romans 8:28', 'bxrp', 'section-bxrp-0', 'kjv')).toBe(
      '/read/scripture/?ref=Romans+8%3A28&from=bxrp&anchor=section-bxrp-0&translation=kjv'
    )
    expect(kindleProfileReadUrl('default')).toBe('/default/read/')
  })

  it('embeds translation in article scripture links', () => {
    const article = renderKindleReadArticleHtml(sampleSections, 'default', 'kjv')
    expect(article).toContain('translation=kjv')
  })

  it('linkifies inline scripture references in html text', () => {
    const html = linkifyScriptureInHtmlForKindleRead(
      '<p>Read Romans 8:28 today.</p>',
      'default',
      'section-1-0'
    )
    expect(html).toBe(
      '<p>Read <a class="kindle-read-scripture-link" href="/read/scripture/?ref=Romans+8%3A28&amp;from=default&amp;anchor=section-1-0">Romans 8:28</a> today.</p>'
    )
  })

  it('assigns block anchors for body scripture links', () => {
    const html = linkifyScriptureInBodyHtmlForKindleRead(
      '<p>First Romans 1:1.</p><p>Second Romans 2:2.</p>',
      'bxrp',
      'section-bxrp-0'
    )
    expect(html).toContain('id="section-bxrp-0-b-0"')
    expect(html).toContain('id="section-bxrp-0-b-1"')
    expect(html).toContain('anchor=section-bxrp-0-b-0')
    expect(html).toContain('anchor=section-bxrp-0-b-1')
  })

  it('includes block anchor on subsection scripture links in rendered article', () => {
    const article = renderKindleReadArticleHtml(sampleSections, 'default')
    expect(article).toContain(
      'href="/read/scripture/?ref=Romans+3%3A23&amp;from=default&amp;anchor=section-1-0-b-0"'
    )
  })

  it('renders inline scripture links without duplicate scripture cards when body has refs', () => {
    const article = renderKindleReadArticleHtml(sampleSections, 'default')
    expect(article).toContain('id="section-1"')
    expect(article).not.toContain('kindle-read-scripture-card')
    expect(article).toContain('kindle-read-scripture-link')
    expect(article).toContain('Romans 3:23')
    expect(article).toContain('kindle-read-nested')
  })

  it('renders scripture cards when subsection body has no inline refs', () => {
    const sections: GospelPresentationData = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Key passage',
            content: '<p>God is holy.</p>',
            scriptureReferences: [{ reference: 'John 3:16' }],
          },
        ],
      },
    ]
    const article = renderKindleReadArticleHtml(sections, 'default')
    expect(article).toContain('kindle-read-scripture-card')
    expect(article).toContain('John 3:16')
  })

  it('renders homework question html instead of escaped tags', () => {
    const sections: GospelPresentationData = [
      {
        section: '2',
        title: 'Homework',
        subsections: [
          {
            title: 'Homework Questions',
            content: '<p>Complete the exercises below.</p>',
            questions: [
              {
                id: 'q1',
                question:
                  '<p>Memory Verse: Philippians 2:3-4 Do nothing from selfishness or empty conceit.</p>',
              },
            ],
          },
        ],
      },
    ]
    const article = renderKindleReadArticleHtml(sections, 'default')
    expect(article).toContain('Memory Verse:')
    expect(article).toContain('id="section-2-0-q-0-b-0"')
    expect(article).not.toContain('&lt;p&gt;')
    expect(article).toContain('<ol class="kindle-read-questions">')
  })

  it('renders collapsible table of contents with section and nested anchors', () => {
    const html = renderKindleReadTocNavHtml(sampleSections)
    expect(html).toContain('<details class="kindle-read-toc">')
    expect(html).toContain('<summary class="kindle-read-toc-title">Table of Contents</summary>')
    expect(html).toContain('href="#section-1"')
    expect(html).toContain('The Problem')
    expect(html).toContain('href="#section-1-0"')
    expect(html).toContain('Sin and judgment')
    expect(html).toContain('href="#section-1-0-0"')
    expect(html).toContain('Nested point')
  })

  it('returns empty toc html when there are no sections', () => {
    expect(renderKindleReadTocNavHtml([])).toBe('')
  })

  it('preserves secular-term map hash links and decodes nbsp in topic column', () => {
    const mapHtml = `<div class="secular-term-map-table-wrap"><table class="secular-term-map-table"><tbody><tr><td class="secular-term-map-terms-cell">self-esteem</td><td class="secular-term-map-topic-cell"><span class="secular-term-map-topic">→&nbsp;<a href="#section-5">Pride and humility</a></span></td></tr></tbody></table></div>`
    const html = linkifyScriptureInBodyHtmlForKindleRead(mapHtml, '26b974ef', 'section-1-0')
    expect(html).toContain('href="#section-5"')
    expect(html).toContain('class="kindle-read-internal-link"')
    expect(html).toContain('Pride and humility')
    expect(html).not.toContain('&nbsp;')
    expect(html).not.toContain('&amp;nbsp;')
    expect(html).toContain('→\u00a0')
  })

  it('decodes double-encoded nbsp before re-escaping for Kindle output', () => {
    const mapHtml = `<span class="secular-term-map-topic">→&amp;nbsp;Topic</span>`
    const html = linkifyScriptureInBodyHtmlForKindleRead(mapHtml, '26b974ef', 'section-1-0')
    expect(html).toContain('→\u00a0Topic')
    expect(html).not.toMatch(/&\u00a0/)
    expect(html).not.toContain('&amp;nbsp;')
  })

  it('renders secular-term map section in article with working topic links', () => {
    const sections: GospelPresentationData = [
      {
        section: '1',
        title: 'Find your topic (secular terms)',
        subsections: [
          {
            title: '',
            content:
              '<div class="secular-term-map-table-wrap"><table class="secular-term-map-table"><tbody><tr><td class="secular-term-map-terms-cell">anxiety</td><td class="secular-term-map-topic-cell"><span class="secular-term-map-topic">→&nbsp;<a href="#section-2">Anxiety and Worry</a></span></td></tr></tbody></table></div>',
          },
        ],
      },
      {
        section: '2',
        title: 'Anxiety and Worry',
        subsections: [{ title: 'Overview', content: '<p>Content here.</p>' }],
      },
    ]
    const article = renderKindleReadArticleHtml(sections, '26b974ef')
    expect(article).toContain('id="section-2"')
    expect(article).toContain('kindle-read-internal-link')
    expect(article).toContain('href="#section-2"')
    expect(article).not.toContain('&nbsp;')
  })
})
