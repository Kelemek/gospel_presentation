import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { PROFILE_VALIDATION } from '@/lib/types'

export const runtime = 'edge'

/**
 * POST /api/profiles/[slug]/answer
 * Save a user's answer to a question (accessible to unauthenticated users)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = await request.json()
    const { questionId, answer, sectionIndex, subsectionIndex, nestedSubsectionIndex } = body

    // Validate answer length
    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      )
    }

    if (answer.length > PROFILE_VALIDATION.ANSWER_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Answer cannot exceed ${PROFILE_VALIDATION.ANSWER_MAX_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Store answer in localStorage on client side - this endpoint just validates
    // The actual storage happens client-side since answers are profile-specific
    // and user-specific (stored in browser)
    
    logger.info(`Answer saved for profile ${slug}, question ${questionId}`)

    return NextResponse.json({
      success: true,
      message: 'Answer saved successfully',
      questionId,
      answeredAt: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Failed to save answer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save answer' },
      { status: 500 }
    )
  }
}
