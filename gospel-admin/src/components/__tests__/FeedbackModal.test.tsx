import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackModal from '../FeedbackModal'

describe('FeedbackModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('does not render when closed', () => {
    render(<FeedbackModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits feedback successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, url: 'https://www.notion.so/page' }),
    })

    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <FeedbackModal
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
    render(<FeedbackModal isOpen onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close feedback modal/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
