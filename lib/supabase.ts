import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://xfznbineuohpfawulrzh.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmem5iaW5ldW9ocGZhd3VscnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMDAwNDYsImV4cCI6MjA2NDg3NjA0Nn0.tQCn1Ed_siQp3Yqjf1a7p53iy-0EdrWLlVQky5zkMao"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: "user" | "admin"
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: "user" | "admin"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: "user" | "admin"
          created_at?: string
          updated_at?: string
        }
      }
      movies: {
        Row: {
          id: number
          title: string
          title_uz: string | null
          title_ru: string | null
          title_en: string | null
          description: string | null
          description_uz: string | null
          description_ru: string | null
          description_en: string | null
          poster_url: string | null
          trailer_url: string | null
          release_year: number | null
          duration: number | null
          rating: number
          imdb_rating: number | null
          director: string | null
          actors: string[] | null
          country: string | null
          language: string | null
          status: "active" | "inactive" | "pending"
          view_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          title_uz?: string | null
          title_ru?: string | null
          title_en?: string | null
          description?: string | null
          description_uz?: string | null
          description_ru?: string | null
          description_en?: string | null
          poster_url?: string | null
          trailer_url?: string | null
          release_year?: number | null
          duration?: number | null
          rating?: number
          imdb_rating?: number | null
          director?: string | null
          actors?: string[] | null
          country?: string | null
          language?: string | null
          status?: "active" | "inactive" | "pending"
          view_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          title_uz?: string | null
          title_ru?: string | null
          title_en?: string | null
          description?: string | null
          description_uz?: string | null
          description_ru?: string | null
          description_en?: string | null
          poster_url?: string | null
          trailer_url?: string | null
          release_year?: number | null
          duration?: number | null
          rating?: number
          imdb_rating?: number | null
          director?: string | null
          actors?: string[] | null
          country?: string | null
          language?: string | null
          status?: "active" | "inactive" | "pending"
          view_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      genres: {
        Row: {
          id: number
          name: string
          name_uz: string | null
          name_ru: string | null
          name_en: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          name: string
          name_uz?: string | null
          name_ru?: string | null
          name_en?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          name_uz?: string | null
          name_ru?: string | null
          name_en?: string | null
          description?: string | null
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: number
          name: string
          color: string
          created_at: string
        }
        Insert: {
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: number
          movie_id: number
          user_id: string
          content: string
          rating: number | null
          parent_id: number | null
          is_approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          movie_id: number
          user_id: string
          content: string
          rating?: number | null
          parent_id?: number | null
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          movie_id?: number
          user_id?: string
          content?: string
          rating?: number | null
          parent_id?: number | null
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
