import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GitHubFeedbackModal from '../GitHubFeedbackModal'

describe('GitHubFeedbackModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('does not render when closed', () => {
    render(<GitHubFeedbackModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits feedback successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, url: 'https://github.com/o/r/issues/1' }),
    })

    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <GitHubFeedbackModal
        isOpen
        onClose={onClose}
        profileSlug="default"
        profileTitle="Default"
      />
    )

    await user.type(screen.getByLabelText(/^title$/i), 'Bug report')
    await user.type(screen.getByLabelText(/^description$/i), 'Something broke')
    await user.click(screen.getByRole('button', { name: /send feedback/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(await screen.findByText(/thank you for your feedback/i)).toBeInTheDocument()
  })

  it('closes from close button', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<GitHubFeedbackModal isOpen onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close feedback modal/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
