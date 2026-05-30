import { createClient } from '@/lib/supabase/server'

export type AdminAuthResult =
  | { ok: true; userId: string; email: string | undefined }
  | { ok: false; status: 401 | 403; error: string }

export async function requireAdminUser(): Promise<AdminAuthResult> {
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || (profile as { role?: string } | null)?.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden - Admin access required' }
  }

  return { ok: true, userId: user.id, email: user.email }
}
