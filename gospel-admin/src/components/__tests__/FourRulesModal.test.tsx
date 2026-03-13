import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FourRulesModal from '../FourRulesModal'

describe('FourRulesModal', () => {
  it('renders nothing when closed', () => {
    const onClose = jest.fn()
    const { container } = render(<FourRulesModal isOpen={false} onClose={onClose} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders title and four rule headers when open', () => {
    const onClose = jest.fn()
    render(<FourRulesModal isOpen={true} onClose={onClose} />)

    expect(screen.getByRole('heading', { name: 'Four Rules of Communication' })).toBeInTheDocument()
    expect(screen.getByText('Rule One - Be Honest')).toBeInTheDocument()
    expect(screen.getByText('Rule Two - Keep Current')).toBeInTheDocument()
    expect(screen.getByText('Rule Three – Attack the Problem, Not the Person')).toBeInTheDocument()
    expect(screen.getByText("Rule Four – Act, Don't React")).toBeInTheDocument()
  })

  it('calls onClose when header close button is clicked', () => {
    const onClose = jest.fn()
    render(<FourRulesModal isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when footer Close button is clicked', () => {
    const onClose = jest.fn()
    render(<FourRulesModal isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
