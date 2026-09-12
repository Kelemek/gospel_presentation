import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotionFeedbackSettings from '../NotionFeedbackSettings'

describe('NotionFeedbackSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('shows Notion branding and loads settings when expanded', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        notion_feedback_enabled: true,
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
        notion_token_masked: 'secr****cdef',
        has_notion_token: true,
        token_from_env: false,
      }),
    })

    const user = userEvent.setup()
    render(<NotionFeedbackSettings />)

    expect(screen.getByRole('button', { name: /notion feedback settings/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /notion feedback settings/i }))

    expect(await screen.findByLabelText(/enable notion feedback/i)).toBeChecked()
    expect(screen.getByLabelText(/database or data source id/i)).toHaveValue(
      '5c7d52ea-16a5-4471-914f-cac7baf28add'
    )
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /test create row/i })).toBeInTheDocument()
    expect(screen.getByText(/site issues/i)).toBeInTheDocument()
  })

  it('posts a create-row test without sending a raw saved token', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notion_feedback_enabled: true,
          notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
          notion_token_masked: 'secr****cdef',
          has_notion_token: true,
          token_from_env: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Created a test Site issues row' }),
      })

    const user = userEvent.setup()
    render(<NotionFeedbackSettings />)
    await user.click(screen.getByRole('button', { name: /notion feedback settings/i }))
    await screen.findByLabelText(/enable notion feedback/i)
    await user.click(screen.getByRole('button', { name: /test create row/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/notion-feedback/test',
        expect.objectContaining({ method: 'POST' })
      )
    })
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string) as {
      action: string
      notion_token: string
    }
    expect(body.action).toBe('create')
    expect(body.notion_token).toBe('')
    expect(await screen.findByText(/created a test site issues row/i)).toBeInTheDocument()
  })
})
