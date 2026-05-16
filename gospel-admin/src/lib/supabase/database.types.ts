// TypeScript types generated from Supabase schema
// Run: npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Postgres `user_role` enum may still include legacy labels; the app treats only `admin` as staff. */
export type UserRole = 'admin' | 'counselor' | 'counselee'

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
          is_template: boolean
          is_public: boolean
          include_in_resources_menu: boolean
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
          is_template?: boolean
          is_public?: boolean
          include_in_resources_menu?: boolean
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
          is_template?: boolean
          is_public?: boolean
          include_in_resources_menu?: boolean
          visit_count?: number
          gospel_data?: Json
          last_viewed_scripture?: Json | null
          created_at?: string
          updated_at?: string
          last_visited?: string | null
          created_by?: string | null
        }
      }
      spurgeon_passage_index: {
        Row: {
          id: string
          passage_key: string
          profile_id: string
          sermon_no: number | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          passage_key: string
          profile_id: string
          sermon_no?: number | null
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          passage_key?: string
          profile_id?: string
          sermon_no?: number | null
          is_primary?: boolean
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          role: UserRole
          display_name: string | null
          preferred_translation: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          display_name?: string | null
          preferred_translation?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          display_name?: string | null
          preferred_translation?: string | null
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
      spurgeon_public_sermons_page: {
        Args: { p_q: string | null; p_offset: number; p_limit: number }
        Returns: Json
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
