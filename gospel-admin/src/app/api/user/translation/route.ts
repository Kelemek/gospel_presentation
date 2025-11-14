import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

    // First, authenticate the user with the regular client (has access to cookies)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Now use admin client to update (bypasses RLS)
    const adminClient = createAdminClient()
    const { error: updateError } = await (adminClient
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
