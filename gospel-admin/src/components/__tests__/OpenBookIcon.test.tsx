import { render, screen } from '@testing-library/react'
import { OpenBookIcon } from '../OpenBookIcon'

const LEFT_PAGE_PATH =
  'M12 6.253C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253'

describe('OpenBookIcon', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })
  })

  it('renders one scale flip across the spine (fold then mirror onto right)', () => {
    const { container } = render(<OpenBookIcon />)
    expect(container.querySelector('.open-book-animated-icon__left-fixed')).toBeInTheDocument()
    expect(container.querySelector('.open-book-animated-icon__sheet')).toBeInTheDocument()
    expect(container.querySelector('.open-book-animated-icon__flip-sheet')).toBeInTheDocument()
    expect(container.querySelector('.open-book-animated-icon__spine')).toBeInTheDocument()
    expect(container.querySelectorAll('animateTransform[type="scale"]')).toHaveLength(1)
    expect(container.querySelector('text')).not.toBeInTheDocument()
  })

  it('shows static left and right pages when reduced motion is preferred', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })
    const { container } = render(<OpenBookIcon />)
    expect(container.querySelector('.open-book-animated-icon__left')).toHaveAttribute('d', LEFT_PAGE_PATH)
    expect(container.querySelector('.open-book-animated-icon__spine')).toBeInTheDocument()
    expect(container.querySelector('.open-book-animated-icon__flip-sheet')).not.toBeInTheDocument()
    expect(container.querySelector('animateTransform')).not.toBeInTheDocument()
  })

  it('defaults to w-6 h-6', () => {
    const { container } = render(<OpenBookIcon />)
    expect(container.querySelector('.open-book-animated-icon')).toHaveClass('w-6', 'h-6')
  })

  it('is decorative (aria-hidden on wrapper)', () => {
    render(<OpenBookIcon />)
    expect(screen.getByText('', { selector: '.open-book-animated-icon[aria-hidden="true"]' })).toBeInTheDocument()
  })
})
