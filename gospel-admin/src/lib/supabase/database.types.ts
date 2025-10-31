// TypeScript types generated from Supabase schema
// Run: npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'counselor'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          is_default: boolean
          visit_count: number
          gospel_data: Json
          last_viewed_scripture: Json | null
          created_at: string
          updated_at: string
          last_visited: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          is_default?: boolean
          visit_count?: number
          gospel_data: Json
          last_viewed_scripture?: Json | null
          created_at?: string
          updated_at?: string
          last_visited?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          is_default?: boolean
          visit_count?: number
          gospel_data?: Json
          last_viewed_scripture?: Json | null
          created_at?: string
          updated_at?: string
          last_visited?: string | null
          created_by?: string | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          role: UserRole
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
