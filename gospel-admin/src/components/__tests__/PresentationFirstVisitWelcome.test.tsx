/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PresentationFirstVisitWelcome from '../PresentationFirstVisitWelcome'
import {
  PRESENTATION_FIRST_VISIT_WELCOME_KEY,
  dismissPresentationWelcome,
} from '@/lib/presentationWelcomeStorage'

jest.mock('@/lib/profileHelpTours', () => ({
  runFullProfileHelpTutorial: jest.fn(),
}))

import { runFullProfileHelpTutorial } from '@/lib/profileHelpTours'

describe('PresentationFirstVisitWelcome', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('shows dialog when welcome has not been dismissed', async () => {
    render(<PresentationFirstVisitWelcome />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^welcome$/i })).toBeInTheDocument()
  })

  it('does not show when already dismissed', () => {
    dismissPresentationWelcome()
    render(<PresentationFirstVisitWelcome />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Close persists dismissal and removes dialog', async () => {
    render(<PresentationFirstVisitWelcome />)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(localStorage.getItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY)).toBe('1')
  })

  it('Start full walkthrough persists dismissal and runs tour', async () => {
    render(<PresentationFirstVisitWelcome />)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: /start full walkthrough/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(runFullProfileHelpTutorial).toHaveBeenCalledTimes(1)
    })
    expect(localStorage.getItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY)).toBe('1')
  })

  it('Escape dismisses like Close', async () => {
    render(<PresentationFirstVisitWelcome />)
    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(localStorage.getItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY)).toBe('1')
  })
})
