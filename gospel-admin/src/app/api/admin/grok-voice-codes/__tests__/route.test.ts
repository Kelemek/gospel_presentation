import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import { issueGrokVoiceCode, listGrokVoiceCodes } from '@/lib/grokVoiceDb'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/grokVoiceDb', () => ({
  issueGrokVoiceCode: jest.fn(),
  listGrokVoiceCodes: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const auth = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const issue = issueGrokVoiceCode as jest.MockedFunction<typeof issueGrokVoiceCode>
const list = listGrokVoiceCodes as jest.MockedFunction<typeof listGrokVoiceCodes>

describe('admin Grok voice codes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    auth.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
  })

  it('returns 403 for a caller who is not an admin', async () => {
    auth.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden - Admin access required' })
    const response = await GET()
    expect(response.status).toBe(403)
    expect(list).not.toHaveBeenCalled()
    const created = await POST(
      new NextRequest('http://localhost/api/admin/grok-voice-codes', {
        method: 'POST',
        body: JSON.stringify({ name: 'Pat' }),
      })
    )
    expect(created.status).toBe(403)
    expect(issue).not.toHaveBeenCalled()
  })

  it('requires a name and returns the plaintext code only from create', async () => {
    const missing = await POST(
      new NextRequest('http://localhost/api/admin/grok-voice-codes', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
    )
    expect(missing.status).toBe(400)
    expect(issue).not.toHaveBeenCalled()

    issue.mockResolvedValue({
      ok: true,
      issued: {
        id: 'code-1',
        name: 'Pat',
        code: 'ABCD-EFGH-JKMN',
        expiresAt: '2026-11-22T00:00:00.000Z',
        maxDevices: 3,
      },
    })
    const created = await POST(
      new NextRequest('http://localhost/api/admin/grok-voice-codes', {
        method: 'POST',
        body: JSON.stringify({ name: ' Pat ' }),
      })
    )
    expect(created.status).toBe(201)
    expect(created.headers.get('Cache-Control')).toBe('no-store')
    await expect(created.json()).resolves.toEqual({
      id: 'code-1',
      name: 'Pat',
      code: 'ABCD-EFGH-JKMN',
      expiresAt: '2026-11-22T00:00:00.000Z',
      maxDevices: 3,
    })
    expect(issue).toHaveBeenCalledWith({
      name: 'Pat',
      expiresInDays: 7,
      maxDevices: 3,
      createdBy: 'admin-1',
    })

    list.mockResolvedValue({
      ok: true,
      codes: [
        {
          id: 'code-1',
          name: 'Pat',
          status: 'active',
          devicesUsed: 0,
          maxDevices: 3,
          minutesThisMonth: 0,
          dollarsThisMonth: 0,
          minutesAllTime: 0,
          dollarsAllTime: 0,
          includesEstimate: false,
          lastUsedAt: null,
          createdAt: '2026-11-15T00:00:00.000Z',
          expiresAt: '2026-11-22T00:00:00.000Z',
          devices: [],
        },
      ],
    })
    const listed = await GET()
    const body = await listed.json()
    expect(body.codes[0].name).toBe('Pat')
    expect(JSON.stringify(body)).not.toContain('ABCD-EFGH-JKMN')
  })
})
