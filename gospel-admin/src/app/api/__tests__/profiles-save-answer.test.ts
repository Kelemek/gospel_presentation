import { POST } from '../profiles/[slug]/save-answer/route'
import { NextRequest } from 'next/server'
import * as dataService from '@/lib/data-service'
import { PROFILE_VALIDATION } from '@/lib/types'

jest.mock('@/lib/data-service')
const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('/api/profiles/[slug]/save-answer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when questionId is missing', async () => {
    const body = { answer: 'My answer' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Question ID is required')
  })

  it('returns 400 when answer is missing', async () => {
    const body = { questionId: 'q1' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Answer is required')
  })

  it('returns 400 when answer is too long', async () => {
    const long = 'a'.repeat(PROFILE_VALIDATION.ANSWER_MAX_LENGTH + 1)
    const body = { questionId: 'q1', answer: long }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Answer exceeds maximum length/)
    expect(data.maxLength).toBe(PROFILE_VALIDATION.ANSWER_MAX_LENGTH)
  })

  it('returns 404 when profile not found', async () => {
    mockDataService.getProfileBySlug.mockResolvedValue(null as any)

    const body = { questionId: 'q1', answer: 'ok' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'missing-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('Profile not found')
  })

  it('saves new answer and returns success', async () => {
    const mockProfile = { slug: 'test-profile', savedAnswers: [] } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue({} as any)

    const body = { questionId: 'q1', answer: 'My answer' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.questionId).toBe('q1')
    expect(mockDataService.updateProfile).toHaveBeenCalled()
  })
})
