import { POST } from '@/app/api/profiles/[slug]/save-answer/route'
import { NextRequest } from 'next/server'
import * as dataService from '@/lib/data-service'
import { PROFILE_VALIDATION } from '@/lib/types'

jest.mock('@/lib/data-service')
const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('POST /api/profiles/[slug]/save-answer', () => {
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

  it('returns 400 when questionId is not a string', async () => {
    const body = { questionId: 123, answer: 'My answer' }
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

  it('returns 400 when answer is not a string', async () => {
    const body = { questionId: 'q1', answer: 42 }
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
    expect(data.answeredAt).toBeDefined()
    expect(mockDataService.updateProfile).toHaveBeenCalledWith('test-profile', {
      savedAnswers: [{ questionId: 'q1', answer: 'My answer', answeredAt: expect.any(Date) }],
    })
  })

  it('updates existing answer when questionId already exists', async () => {
    const existingAnswer = { questionId: 'q1', answer: 'Old', answeredAt: new Date() }
    const mockProfile = { slug: 'test-profile', savedAnswers: [existingAnswer] } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue({} as any)

    const body = { questionId: 'q1', answer: 'Updated answer' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockDataService.updateProfile).toHaveBeenCalledWith('test-profile', {
      savedAnswers: [{ questionId: 'q1', answer: 'Updated answer', answeredAt: expect.any(Date) }],
    })
  })

  it('accepts empty string and removes saved answer for that question', async () => {
    const existingAnswer = { questionId: 'q1', answer: 'Old', answeredAt: new Date() }
    const mockProfile = { slug: 'test-profile', savedAnswers: [existingAnswer] } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue({} as any)

    const body = { questionId: 'q1', answer: '' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cleared).toBe(true)
    expect(mockDataService.updateProfile).toHaveBeenCalledWith('test-profile', {
      savedAnswers: [],
    })
  })

  it('accepts whitespace-only answer as clear', async () => {
    const existingAnswer = { questionId: 'q1', answer: 'Old', answeredAt: new Date() }
    const mockProfile = { slug: 'test-profile', savedAnswers: [existingAnswer] } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue({} as any)

    const body = { questionId: 'q1', answer: '  \n  ' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    expect(res.status).toBe(200)
    expect(mockDataService.updateProfile).toHaveBeenCalledWith('test-profile', {
      savedAnswers: [],
    })
  })

  it('accepts empty string when no prior answer (no-op clear)', async () => {
    const mockProfile = { slug: 'test-profile', savedAnswers: [] } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue({} as any)

    const body = { questionId: 'q1', answer: '' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    expect(res.status).toBe(200)
    expect(mockDataService.updateProfile).toHaveBeenCalledWith('test-profile', {
      savedAnswers: [],
    })
  })

  it('uses empty savedAnswers when profile has none', async () => {
    const mockProfile = { slug: 'test-profile' } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue({} as any)

    const body = { questionId: 'q1', answer: 'First' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    expect(res.status).toBe(200)
    expect(mockDataService.updateProfile).toHaveBeenCalledWith('test-profile', {
      savedAnswers: [{ questionId: 'q1', answer: 'First', answeredAt: expect.any(Date) }],
    })
  })

  it('returns 500 when getProfileBySlug throws', async () => {
    mockDataService.getProfileBySlug.mockRejectedValue(new Error('DB error'))

    const body = { questionId: 'q1', answer: 'ok' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to save answer')
  })

  it('returns 500 when updateProfile throws', async () => {
    const mockProfile = { slug: 'test-profile', savedAnswers: [] } as any
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockRejectedValue(new Error('Update failed'))

    const body = { questionId: 'q1', answer: 'ok' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to save answer')
  })
})
