import { render, screen } from '@testing-library/react'
import MenuLocalDataBackup from '@/components/MenuLocalDataBackup'

describe('MenuLocalDataBackup', () => {
  it('renders save and restore actions', () => {
    render(<MenuLocalDataBackup />)
    expect(screen.getByRole('button', { name: /save my data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restore my data/i })).toBeInTheDocument()
  })
})
