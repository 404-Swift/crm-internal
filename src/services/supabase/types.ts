export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          company: string | null
          phone: string | null
          source: string | null
          status: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          company?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          company?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      deals: {
        Row: {
          id: string
          title: string
          contact_id: string
          amount: number
          stage: string
          probability: number
          expected_close_date: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          contact_id: string
          amount: number
          stage: string
          probability: number
          expected_close_date?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          contact_id?: string
          amount?: number
          stage?: string
          probability?: number
          expected_close_date?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      activities: {
        Row: {
          id: string
          type: string
          contact_id: string | null
          deal_id: string | null
          description: string
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          type: string
          contact_id?: string | null
          deal_id?: string | null
          description: string
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          type?: string
          contact_id?: string | null
          deal_id?: string | null
          description?: string
          created_at?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
