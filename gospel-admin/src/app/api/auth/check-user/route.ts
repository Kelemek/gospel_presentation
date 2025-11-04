// API Route: POST /api/auth/check-user - Check if user exists in database
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Query auth.users to check if user exists
    const { data, error } = await adminClient.auth.admin.listUsers()

    if (error) {
      logger.error('Error checking user existence:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    // Check if user with this email exists
    const userExists = data.users.some(user => user.email?.toLowerCase() === email.toLowerCase())

    return NextResponse.json({
      exists: userExists,
    })
  } catch (error: any) {
    logger.error('Error in check-user endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to verify user' },
      { status: 500 }
    )
  }
}
