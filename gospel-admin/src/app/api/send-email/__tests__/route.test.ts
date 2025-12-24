import { POST } from '@/app/api/send-email/route'
import { NextRequest } from 'next/server'

// Mock the fetch function
global.fetch = jest.fn()

describe('POST /api/send-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 400 when subject is missing', async () => {
    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ body: 'Test body' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when body is missing', async () => {
    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ subject: 'Test' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when no recipients provided', async () => {
    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test',
        body: 'Test body',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain("Must provide either 'to' or 'bcc'")
  })

  it('forwards valid email request to Edge Function', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true }),
      json: async () => ({ success: true }),
    })

    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: ['user@example.com'],
        subject: 'Test',
        body: 'Test body',
        isHtml: false,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://abc123.supabase.co/functions/v1/send-email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        }),
      })
    )
  })

  it('handles Edge Function errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: 'Auth failed' }),
      json: async () => ({ error: 'Auth failed' }),
    })

    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: ['user@example.com'],
        subject: 'Test',
        body: 'Test body',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toContain('Failed to send email')
  })

  it('returns 500 when SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: ['user@example.com'],
        subject: 'Test',
        body: 'Test body',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('handles BCC recipients', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true }),
      json: async () => ({ success: true }),
    })

    const request = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        bcc: ['user1@example.com', 'user2@example.com'],
        subject: 'Bulk email',
        body: 'Test body',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1]
    const body = JSON.parse(callArgs.body)
    expect(body.bcc).toEqual(['user1@example.com', 'user2@example.com'])
  })
})
