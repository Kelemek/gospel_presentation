import { NextRequest, NextResponse } from 'next/server'
import { updateProfile } from '../../../../../lib/data-service'

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

interface ScriptureProgressData {
  reference: string
  sectionId: string
  subsectionId: string
  viewedAt: string
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = await params
    const progressData: ScriptureProgressData = await request.json()

    // Don't track for default profile
    if (slug === 'default') {
      return NextResponse.json(
        { error: 'Cannot track progress for default profile' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!progressData.reference || !progressData.sectionId || !progressData.subsectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: reference, sectionId, subsectionId' },
        { status: 400 }
      )
    }

    // Update profile with last viewed scripture
    const updatedProfile = await updateProfile(slug, {
      lastViewedScripture: {
        reference: progressData.reference,
        sectionId: progressData.sectionId,
        subsectionId: progressData.subsectionId,
        viewedAt: new Date(progressData.viewedAt)
      }
    })

    return NextResponse.json({
      success: true,
      lastViewedScripture: updatedProfile.lastViewedScripture
    })

  } catch (error) {
    console.error('Error updating scripture progress:', error)
    return NextResponse.json(
      { error: 'Failed to update scripture progress' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = await params

    // Don't reset for default profile
    if (slug === 'default') {
      return NextResponse.json(
        { error: 'Cannot reset progress for default profile' },
        { status: 400 }
      )
    }

    // Update profile to remove last viewed scripture
    await updateProfile(slug, {
      lastViewedScripture: null as any
    })

    return NextResponse.json({
      success: true,
      message: 'Scripture progress reset successfully'
    })

  } catch (error) {
    console.error('Error resetting scripture progress:', error)
    return NextResponse.json(
      { error: 'Failed to reset scripture progress' },
      { status: 500 }
    )
  }
}