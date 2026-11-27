import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/server'

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!USER_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as { enabled?: unknown }
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      // @ts-expect-error - Supabase type inference issue
      .update({ grok_voice_enabled: body.enabled })
      .eq('id', id)
      .select('id, grok_voice_enabled')
      .maybeSingle<{ id: string; grok_voice_enabled: boolean }>()

    if (error) {
      logger.error('Failed to update Grok voice access', error)
      return NextResponse.json({ error: 'Failed to update Grok voice' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ enabled: data.grok_voice_enabled === true })
  } catch (error) {
    logger.error('Grok voice admin route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
