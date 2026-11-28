import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import GrokVoiceCodesSettings from '@/components/GrokVoiceCodesSettings'

const CODE_ID = '11111111-1111-4111-8111-111111111111'
const DEVICE_ID = '22222222-2222-4222-8222-222222222222'
const PLAINTEXT = 'ABCD-EFGH-JKMN'

const listed = {
  codes: [
    {
      id: CODE_ID,
      name: 'Sunday school',
      status: 'active',
      devicesUsed: 1,
      maxDevices: 3,
      minutesThisMonth: 2,
      dollarsThisMonth: 15,
      minutesAllTime: 3,
      dollarsAllTime: 45,
      includesEstimate: false,
      lastUsedAt: '2026-11-15T18:00:00.000Z',
      createdAt: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-11-08T00:00:00.000Z',
      devices: [
        {
          id: DEVICE_ID,
          label: 'web',
          revoked: false,
          createdAt: '2026-11-02T00:00:00.000Z',
          lastUsedAt: '2026-11-15T18:00:00.000Z',
          minutesThisMonth: 2,
          dollarsThisMonth: 15,
          minutesAllTime: 3,
          dollarsAllTime: 45,
          includesEstimate: false,
        },
      ],
    },
  ],
}

describe('GrokVoiceCodesSettings', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: CODE_ID,
            name: 'Pat',
            code: PLAINTEXT,
            expiresAt: '2026-11-22T00:00:00.000Z',
            maxDevices: 3,
          }),
        }
      }
      if (init?.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => ({ revoked: true }) }
      }
      return { ok: true, status: 200, json: async () => listed }
    }) as typeof fetch
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('loads codes only after the card opens, shows a new code once, and can revoke a device', async () => {
    render(<GrokVoiceCodesSettings />)
    expect(global.fetch).not.toHaveBeenCalled()

    const header = screen.getByRole('button', { name: /grok voice codes/i })
    expect(header.querySelector('svg')).not.toHaveClass('rotate-180')
    expect(header.textContent).not.toMatch(/[+\u2212]/)
    fireEvent.click(header)
    expect(header.querySelector('svg')).toHaveClass('rotate-180')
    expect(await screen.findByText('Sunday school')).toBeInTheDocument()
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(PLAINTEXT)

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Pat' } })
    fireEvent.click(screen.getByRole('button', { name: /create code/i }))
    expect(await screen.findByText(PLAINTEXT)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/grok-voice-codes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Pat', expiresInDays: 7, maxDevices: 3 }),
      })
    )

    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PLAINTEXT))
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(PLAINTEXT)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^devices$/i }))
    fireEvent.click(screen.getByRole('button', { name: /revoke device/i }))
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/grok-voice-devices/${DEVICE_ID}`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ revoked: true }) })
      )
    )
  })

  it('requires a name before creating a code', () => {
    render(<GrokVoiceCodesSettings />)
    fireEvent.click(screen.getByRole('button', { name: /grok voice codes/i }))
    fireEvent.click(screen.getByRole('button', { name: /create code/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/who this code is for/i)
    expect(global.fetch).not.toHaveBeenCalledWith(
      '/api/admin/grok-voice-codes',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
