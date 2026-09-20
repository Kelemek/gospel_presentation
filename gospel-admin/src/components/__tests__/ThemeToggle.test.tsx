import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle, { themePanelStyleFromTrigger } from '../ThemeToggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

const STORAGE_KEY = 'gospel-profile-theme'

function renderWithProvider(initialTheme: 'light' | 'blossom' | 'dark' | 'black' = 'light') {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, initialTheme)
  }
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('renders icon-only trigger with accessible label for current theme', () => {
    renderWithProvider('light')
    const button = screen.getByRole('button', { name: /appearance: light/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Appearance: Light')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button.querySelector('circle')).not.toBeInTheDocument()
  })

  it('updates trigger icon when stored theme changes', () => {
    const { rerender } = renderWithProvider('light')
    const lightButton = screen.getByRole('button', { name: /appearance: light/i })
    expect(lightButton.querySelector('circle')).not.toBeInTheDocument()

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'dark')
    }
    rerender(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const darkButton = screen.getByRole('button', { name: /appearance: dark/i })
    expect(darkButton.querySelector('path')?.getAttribute('d')).toContain('9 9')
  })

  it('opens listbox with icon and name for each theme', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('light')

    await user.click(screen.getByRole('button', { name: /appearance: light/i }))

    const panel = within(document.body).getByRole('listbox', { name: /appearance/i })
    expect(within(panel).getByRole('option', { name: /light/i })).toHaveAttribute('aria-selected', 'true')
    expect(within(panel).getByRole('option', { name: /blossom/i })).toHaveAttribute('aria-selected', 'false')
    expect(within(panel).getByRole('option', { name: /dark/i })).toHaveAttribute('aria-selected', 'false')
    expect(within(panel).getByRole('option', { name: /black/i })).toHaveAttribute('aria-selected', 'false')
    expect(within(panel).getByText('Light')).toBeInTheDocument()
    expect(within(panel).getByText('Blossom')).toBeInTheDocument()
    expect(within(panel).getByText('Dark')).toBeInTheDocument()
    expect(within(panel).getByText('Black')).toBeInTheDocument()
  })

  it('selects Blossom, persists to localStorage, and closes the panel', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('light')

    await user.click(screen.getByRole('button', { name: /appearance: light/i }))
    const panel = within(document.body).getByRole('listbox', { name: /appearance/i })
    await user.click(within(panel).getByRole('option', { name: /^blossom$/i }))

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('blossom')
    expect(screen.getByRole('button', { name: /appearance: blossom/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('selects a theme, persists to localStorage, and closes the panel', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('light')

    await user.click(screen.getByRole('button', { name: /appearance: light/i }))
    const panel = within(document.body).getByRole('listbox', { name: /appearance/i })
    await user.click(within(panel).getByRole('option', { name: /^dark$/i }))

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: /appearance: dark/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(within(document.body).queryByRole('listbox', { name: /appearance/i })).not.toBeInTheDocument()
  })

  it('shows outline circle icon on the Black panel row', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('light')

    await user.click(screen.getByRole('button', { name: /appearance: light/i }))
    const blackOption = within(document.body).getByRole('option', { name: /black/i })
    const svg = blackOption.querySelector('svg')
    expect(blackOption.querySelector('circle')).toBeInTheDocument()
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })
})

describe('themePanelStyleFromTrigger', () => {
  const origInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: origInnerWidth,
    })
  })

  it('aligns panel right edge to the trigger on narrow viewports (opens left)', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 400,
    })
    const rect = { right: 390, bottom: 44 } as DOMRectReadOnly
    const s = themePanelStyleFromTrigger(rect)
    expect(s.top).toBe(52)
    expect(s.width).toBe(200)
    expect(s.left).toBe(190)
    expect(s.right).toBe('auto')
  })

  it('narrows the panel when the trigger is too far left for full width', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 900,
    })
    const rect = { right: 100, bottom: 10 } as DOMRectReadOnly
    const s = themePanelStyleFromTrigger(rect)
    expect(s.left).toBe(8)
    expect(s.width).toBe(92)
  })
})
