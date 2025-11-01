import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ComaTemplate = {
  id: string
  name: string
  questions: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}

type UserProfile = {
  role: 'admin' | 'counselor' | 'counselee'
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get the default COMA template
    const { data, error } = await supabase
      .from('coma_templates')
      .select('*')
      .eq('is_default', true)
      .single<ComaTemplate>()

    if (error) {
      console.error('Error fetching COMA template:', error)
      return NextResponse.json({ error: 'Failed to fetch COMA template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Error in GET /api/coma-template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single<UserProfile>()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { questions } = await request.json()

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions must be an array' }, { status: 400 })
    }

    // Update the default template
    const { data, error } = await supabase
      .from('coma_templates')
      // @ts-expect-error - Supabase type inference issue
      .update({ 
        questions,
        updated_at: new Date().toISOString()
      })
      .eq('is_default', true)
      .select<'*', ComaTemplate>()
      .single()

    if (error) {
      console.error('Error updating COMA template:', error)
      return NextResponse.json({ error: 'Failed to update COMA template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Error in PUT /api/coma-template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
