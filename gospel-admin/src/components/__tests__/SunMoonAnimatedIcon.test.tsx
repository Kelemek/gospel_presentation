import { render, screen } from '@testing-library/react'
import SunMoonAnimatedIcon from '../SunMoonAnimatedIcon'

const ORIGINAL_SUN_PATH =
  'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'

describe('SunMoonAnimatedIcon', () => {
  it('uses the original round sun path (circle + rays)', () => {
    const { container } = render(<SunMoonAnimatedIcon />)
    const sun = container.querySelector('.sun-moon-animated-icon__sun')
    expect(sun).toBeInTheDocument()
    expect(sun).toHaveAttribute('d', ORIGINAL_SUN_PATH)
    expect(container.querySelector('.sun-moon-animated-icon__moon')).not.toBeInTheDocument()
    const horizon = container.querySelector('.sun-moon-animated-icon__horizon')
    expect(horizon).toBeInTheDocument()
    expect(horizon).toHaveAttribute('y1', '16')
    expect(horizon).toHaveAttribute('y2', '16')
    expect(container.querySelectorAll('.sun-moon-animated-icon__water-line').length).toBe(4)
  })

  it('defaults to w-6 h-6 (slightly larger than the original w-5)', () => {
    const { container } = render(<SunMoonAnimatedIcon />)
    expect(container.querySelector('.sun-moon-animated-icon')).toHaveClass('w-6', 'h-6')
  })

  it('is decorative (aria-hidden on wrapper)', () => {
    render(<SunMoonAnimatedIcon />)
    expect(screen.getByText('', { selector: '.sun-moon-animated-icon[aria-hidden="true"]' })).toBeInTheDocument()
  })
})
