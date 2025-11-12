import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: settings, error } = await supabase
      .from('translation_settings')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      logger.error('Error fetching translation settings:', error)
      return NextResponse.json({ error: 'Failed to fetch translation settings' }, { status: 500 })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    logger.error('Translation settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { translation_code, is_enabled } = await request.json()

    if (!translation_code || typeof is_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Don't allow disabling ESV - it's the fallback
    if (translation_code === 'esv' && !is_enabled) {
      return NextResponse.json({ error: 'Cannot disable ESV - it is the fallback translation' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null, error: any }

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Update the translation setting
    const { error: updateError } = await (supabase
      .from('translation_settings') as any)
      .update({ 
        is_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('translation_code', translation_code)

    if (updateError) {
      logger.error('Error updating translation setting:', updateError)
      return NextResponse.json({ error: 'Failed to update translation setting' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Translation settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
