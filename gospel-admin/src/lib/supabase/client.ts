// Supabase client for client-side operations
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'
import * as Sentry from '@sentry/nextjs'

export const createClient = () => {
  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Add Sentry breadcrumbs for Supabase operations
  const originalFrom = client.from.bind(client)
  client.from = (table: any) => {
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: `Query table: ${table}`,
      level: 'info',
    })
    return originalFrom(table)
  }
  
  return client
}

// Singleton instance
let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}
