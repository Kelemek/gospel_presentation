import { render, screen } from '@testing-library/react'
import KindleReadScriptureChapterNavLinks from '../KindleReadScriptureChapterNav'

describe('KindleReadScriptureChapterNavLinks', () => {
  it('renders prev and next chapter links', () => {
    render(
      <KindleReadScriptureChapterNavLinks
        nav={{
          prev: { href: '/read/scripture/?ref=Acts+19&from=bxrp', label: 'Previous passage (Acts 19)' },
          next: { href: '/read/scripture/?ref=Acts+21&from=bxrp', label: 'Next passage (Acts 21)' },
        }}
      />
    )
    expect(screen.getByRole('link', { name: 'Previous passage (Acts 19)' })).toHaveAttribute(
      'href',
      '/read/scripture/?ref=Acts+19&from=bxrp'
    )
    expect(screen.getByRole('link', { name: 'Next passage (Acts 21)' })).toHaveAttribute(
      'href',
      '/read/scripture/?ref=Acts+21&from=bxrp'
    )
  })

  it('renders nothing when both links are absent', () => {
    const { container } = render(
      <KindleReadScriptureChapterNavLinks nav={{ prev: null, next: null }} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
