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
      bookings: {
        Row: {
          id: string
          google_calendar_event_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          location: string | null
          contact_id: string | null
          deal_id: string | null
          created_at: string
          updated_at: string
          user_id: string
          google_calendar_synced_at: string | null
        }
        Insert: {
          id?: string
          google_calendar_event_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          location?: string | null
          contact_id?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          google_calendar_synced_at?: string | null
        }
        Update: {
          id?: string
          google_calendar_event_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          location?: string | null
          contact_id?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          google_calendar_synced_at?: string | null
        }
      }
      team_members: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          role: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          role?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          role?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      booking_team_members: {
        Row: {
          id: string
          booking_id: string
          team_member_id: string
          assigned_at: string
          assigned_by: string
        }
        Insert: {
          id?: string
          booking_id: string
          team_member_id: string
          assigned_at?: string
          assigned_by: string
        }
        Update: {
          id?: string
          booking_id?: string
          team_member_id?: string
          assigned_at?: string
          assigned_by?: string
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
