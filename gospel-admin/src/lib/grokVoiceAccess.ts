import { createClient } from '@/lib/supabase/server'

export type GrokVoiceAccess =
  | { ok: true; userId: string; xaiKey: string }
  | { ok: false; status: 401 | 403 | 503; error: string }

/** Callers must not put `xaiKey` in a response. */
export async function assertGrokVoiceAccess(): Promise<GrokVoiceAccess> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('grok_voice_enabled')
    .eq('id', user.id)
    .maybeSingle<{ grok_voice_enabled: boolean }>()

  if (profileError || profile?.grok_voice_enabled !== true) {
    return { ok: false, status: 403, error: 'Grok voice is not enabled for this account.' }
  }

  const xaiKey = process.env.XAI_API_KEY?.trim()
  if (!xaiKey) {
    return { ok: false, status: 503, error: 'Grok voice is not configured on the server.' }
  }

  return { ok: true, userId: user.id, xaiKey }
}
