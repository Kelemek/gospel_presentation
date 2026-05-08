import type { GospelSection } from '@/lib/types'
import { findNextReadAlongScope } from '../profileReadAlongNextAnchor'

const twoSectionFixture: GospelSection[] = [
  {
    section: '1',
    title: 'First',
    subsections: [
      { title: 'A', content: 'alpha' },
      { title: 'B', content: 'beta' },
    ],
  },
  {
    section: '2',
    title: 'Second',
    subsections: [{ title: 'C', content: 'gamma' }],
  },
]

describe('findNextReadAlongScope', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('skips subsection anchors nested inside the completed top-level section', () => {
    document.body.innerHTML = `
      <section id="section-1">
        <div id="section-1-0"><p>Alpha text.</p></div>
        <div id="section-1-1"><p>Beta text.</p></div>
      </section>
      <section id="section-2">
        <div id="section-2-0"><p>Gamma text.</p></div>
      </section>
    `
    const section1 = document.getElementById('section-1') as HTMLElement
    const next = findNextReadAlongScope(twoSectionFixture, section1, 'section-1')
    expect(next?.anchorId).toBe('section-2')
    expect(next?.text).toContain('Gamma')
  })

  it('after a subsection, advances to the following sibling subsection', () => {
    document.body.innerHTML = `
      <section id="section-1">
        <div id="section-1-0"><p>Alpha text.</p></div>
        <div id="section-1-1"><p>Beta text.</p></div>
      </section>
    `
    const subsection0 = document.getElementById('section-1-0') as HTMLElement
    const next = findNextReadAlongScope(twoSectionFixture, subsection0, 'section-1-0')
    expect(next?.anchorId).toBe('section-1-1')
    expect(next?.text).toContain('Beta')
  })

  it('returns null when there is no later readable anchor', () => {
    document.body.innerHTML = `
      <section id="section-1">
        <div id="section-1-0"><p>Only.</p></div>
      </section>
    `
    const subsection0 = document.getElementById('section-1-0') as HTMLElement
    expect(findNextReadAlongScope(twoSectionFixture, subsection0, 'section-1-0')).toBeNull()
  })
})
