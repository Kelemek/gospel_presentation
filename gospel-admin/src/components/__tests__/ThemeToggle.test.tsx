import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../ThemeToggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

const STORAGE_KEY = 'gospel-profile-theme'

function renderWithProvider(initialTheme: 'light' | 'dark' | 'black' = 'light') {
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

  it('renders a button with accessible label for light mode', () => {
    renderWithProvider('light')
    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Switch to dark mode')
  })

  it('renders a button with accessible label for dark mode', () => {
    renderWithProvider('dark')
    const button = screen.getByRole('button', { name: /switch to black mode/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Switch to black mode')
  })

  it('renders a button with accessible label for black mode', () => {
    renderWithProvider('black')
    const button = screen.getByRole('button', { name: /switch to light mode/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Switch to light mode')
  })

  it('shows moon icon when theme is light', () => {
    renderWithProvider('light')
    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(button.querySelector('circle')).not.toBeInTheDocument()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('shows filled circle when theme is dark', () => {
    renderWithProvider('dark')
    const button = screen.getByRole('button', { name: /switch to black mode/i })
    expect(button.querySelector('circle')).toBeInTheDocument()
  })

  it('cycles light → dark → black → light and persists to localStorage', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('light')

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }))
    expect(screen.getByRole('button', { name: /switch to black mode/i })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')

    await user.click(screen.getByRole('button', { name: /switch to black mode/i }))
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('black')

    await user.click(screen.getByRole('button', { name: /switch to light mode/i }))
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
  })
})
