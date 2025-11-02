import { POST } from '../profiles/[slug]/answer/route'
import { NextRequest } from 'next/server'
import { PROFILE_VALIDATION } from '@/lib/types'

describe('/api/profiles/[slug]/answer', () => {
  it('returns 400 when answer is missing', async () => {
    const body = { questionId: 'q1' }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Answer is required')
  })

  it('returns 400 when answer too long', async () => {
    const body = { questionId: 'q1', answer: 'a'.repeat(PROFILE_VALIDATION.ANSWER_MAX_LENGTH + 1) }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/cannot exceed/) 
  })

  it('returns success for valid answer', async () => {
    const body = { questionId: 'q1', answer: 'This is fine', sectionIndex: 0 }
    const request = new NextRequest('http://localhost:3000', { method: 'POST', body: JSON.stringify(body) })

    const res = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.questionId).toBe('q1')
  })
})
