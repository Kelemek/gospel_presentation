'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useGrokVoiceEnabled(isHydrated: boolean): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!isHydrated) return

    const check = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('grok_voice_enabled')
        .eq('id', user.id)
        .single<{ grok_voice_enabled: boolean }>()

      if (userProfile?.grok_voice_enabled === true) {
        setEnabled(true)
      }
    }
    void check()
  }, [isHydrated])

  return enabled
}
