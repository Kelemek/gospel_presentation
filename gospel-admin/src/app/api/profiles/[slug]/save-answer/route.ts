import { NextRequest, NextResponse } from 'next/server'
import * as dataService from '@/lib/data-service'
import { PROFILE_VALIDATION, SavedAnswer } from '@/lib/types'

export const runtime = 'edge'

interface SaveAnswerRequest {
  questionId: string
  answer: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body: SaveAnswerRequest = await request.json()
    const { questionId, answer } = body

    // Validate inputs
    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      )
    }

    // Validate answer length
    if (answer.length > PROFILE_VALIDATION.ANSWER_MAX_LENGTH) {
      return NextResponse.json(
        { 
          error: `Answer exceeds maximum length of ${PROFILE_VALIDATION.ANSWER_MAX_LENGTH} characters`,
          maxLength: PROFILE_VALIDATION.ANSWER_MAX_LENGTH 
        },
        { status: 400 }
      )
    }

    // Get the profile
    const profile = await dataService.getProfileBySlug(slug)

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get existing saved answers or initialize empty array
    const savedAnswers = profile.savedAnswers || []

    // Find and update existing answer or add new one
    const existingIndex = savedAnswers.findIndex((a: SavedAnswer) => a.questionId === questionId)
    const newAnswer: SavedAnswer = {
      questionId,
      answer,
      answeredAt: new Date()
    }

    if (existingIndex >= 0) {
      savedAnswers[existingIndex] = newAnswer
    } else {
      savedAnswers.push(newAnswer)
    }

    // Update the profile with new saved answers
    const updatedProfile = await dataService.updateProfile(slug, {
      savedAnswers
    })

    return NextResponse.json({
      success: true,
      questionId,
      answeredAt: newAnswer.answeredAt
    })

  } catch (error) {
    console.error('Error saving answer:', error)
    return NextResponse.json(
      { error: 'Failed to save answer' },
      { status: 500 }
    )
  }
}
