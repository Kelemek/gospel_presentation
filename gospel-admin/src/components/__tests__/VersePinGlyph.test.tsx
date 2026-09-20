import { render, screen } from '@testing-library/react'
import VersePinGlyph, { versePinEmojiFilterCss } from '@/components/VersePinGlyph'
import { VERSE_PIN_COLOR_IDS } from '@/lib/versePinStorage'

describe('VersePinGlyph', () => {
  it('renders the pushpin emoji with a per-color CSS filter', () => {
    const { container } = render(<VersePinGlyph colorId="blue" />)
    expect(container.textContent).toContain('📌')
    const span = container.querySelector('span')
    expect(span?.style.filter).toBe(versePinEmojiFilterCss('blue'))
  })

  it('uses a distinct filter string for each pin color', () => {
    const filters = VERSE_PIN_COLOR_IDS.map((id) => versePinEmojiFilterCss(id))
    expect(new Set(filters).size).toBe(VERSE_PIN_COLOR_IDS.length)
    for (const f of filters) {
      expect(f).toMatch(/brightness/)
    }
  })

  it('passes title to the emoji span', () => {
    render(<VersePinGlyph colorId="green" title="Green pin" />)
    expect(screen.getByTitle('Green pin')).toBeInTheDocument()
  })
})
