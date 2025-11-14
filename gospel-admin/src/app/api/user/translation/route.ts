import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { translation } = await request.json()

    if (!translation || (translation !== 'esv' && translation !== 'kjv' && translation !== 'nasb')) {
      return NextResponse.json(
        { error: 'Invalid translation. Must be "esv", "kjv", or "nasb"' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update the user's profile with the new translation preference
    // Using admin client to bypass RLS
    const { error: updateError } = await (supabase
      .from('user_profiles') as any)
      .update({ preferred_translation: translation })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Error updating translation preference:', updateError)
      return NextResponse.json(
        { error: 'Failed to update translation preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Translation update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
