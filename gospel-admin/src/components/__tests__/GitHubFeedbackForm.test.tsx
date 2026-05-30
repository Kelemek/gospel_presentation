import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GitHubFeedbackForm from '../GitHubFeedbackForm'

describe('GitHubFeedbackForm', () => {
  it('renders fields and disables submit until filled', () => {
    render(<GitHubFeedbackForm onSubmit={jest.fn().mockResolvedValue(true)} />)
    expect(screen.getByLabelText(/feedback type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send feedback/i })).toBeDisabled()
  })

  it('submits values when valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    render(<GitHubFeedbackForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/^title$/i), 'Improve reader')
    await user.type(screen.getByLabelText(/^description$/i), 'Please add feature X')
    await user.click(screen.getByRole('button', { name: /send feedback/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'suggestion',
      title: 'Improve reader',
      description: 'Please add feature X',
    })
  })

  it('submits selected feedback type from custom listbox', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    render(<GitHubFeedbackForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /feedback type/i }))
    await user.click(screen.getByRole('option', { name: /bug report/i }))
    await user.type(screen.getByLabelText(/^title$/i), 'Broken link')
    await user.type(screen.getByLabelText(/^description$/i), 'Footer link 404s')
    await user.click(screen.getByRole('button', { name: /send feedback/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'bug',
      title: 'Broken link',
      description: 'Footer link 404s',
    })
  })

  it('shows success message', () => {
    render(
      <GitHubFeedbackForm
        onSubmit={jest.fn().mockResolvedValue(true)}
        successMessage="Thank you!"
      />
    )
    expect(screen.getByText(/thank you for your feedback/i)).toBeInTheDocument()
  })
})
