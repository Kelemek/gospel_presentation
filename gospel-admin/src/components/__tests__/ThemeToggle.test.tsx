import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../ThemeToggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

const STORAGE_KEY = 'gospel-profile-theme'

function renderWithProvider(initialTheme: 'light' | 'dark' = 'light') {
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
    const button = screen.getByRole('button', { name: /switch to light mode/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Switch to light mode')
  })

  it('shows moon icon when theme is light', () => {
    renderWithProvider('light')
    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('shows sun icon when theme is dark', () => {
    renderWithProvider('dark')
    const button = screen.getByRole('button', { name: /switch to light mode/i })
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('toggles theme when clicked and persists to localStorage', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('light')

    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    await user.click(button)

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
    if (typeof window !== 'undefined') {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
    }
  })

  it('toggles from dark to light when clicked', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProvider('dark')

    const button = screen.getByRole('button', { name: /switch to light mode/i })
    await user.click(button)

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
    if (typeof window !== 'undefined') {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
    }
  })
})
