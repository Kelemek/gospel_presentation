// Supabase client for server-side operations (API routes, Server Components)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/database.types'
import * as Sentry from '@sentry/nextjs'

export const createClient = async () => {
  const cookieStore = await cookies()

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Components can't set cookies during render
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Components can't delete cookies during render
          }
        },
      },
    }
  )
  
  // Add Sentry breadcrumbs for Supabase operations (skip if mocked)
  if (client.from && typeof client.from === 'function') {
    const originalFrom = client.from.bind(client)
    client.from = (table: any) => {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: `Query table: ${table}`,
        level: 'info',
      })
      return originalFrom(table)
    }
  }
  
  return client
}

// Admin client for bypassing RLS (use carefully!)
export const createAdminClient = () => {
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // Service role key
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  )
  
  // Add Sentry breadcrumbs for admin operations (skip if mocked)
  if (client.from && typeof client.from === 'function') {
    const originalFrom = client.from.bind(client)
    client.from = (table: any) => {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: `Admin query table: ${table}`,
        level: 'info',
      })
      return originalFrom(table)
    }
  }
  
  return client
}
