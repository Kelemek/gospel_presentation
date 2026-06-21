import { render, screen } from '@testing-library/react'
import MenuLocalDataBackup from '@/components/MenuLocalDataBackup'

describe('MenuLocalDataBackup', () => {
  it('renders save and restore actions', () => {
    render(<MenuLocalDataBackup />)
    expect(screen.getByRole('button', { name: /save my data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restore my data/i })).toBeInTheDocument()
  })

  it('shows Sync my data with Beta on the sync button', () => {
    render(<MenuLocalDataBackup />)
    const syncButtons = screen.getAllByRole('button', { name: /sync my data/i })
    expect(syncButtons).toHaveLength(1)
    expect(syncButtons[0]).toHaveTextContent('Sync my data')
    expect(syncButtons[0]).toHaveTextContent('Beta')
  })
})
