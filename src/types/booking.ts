export interface Booking {
  id: string
  google_calendar_event_id?: string | null
  title: string
  description?: string | null
  start_time: string
  end_time: string
  location?: string | null
  contact_id?: string | null
  deal_id?: string | null
  created_at: string
  updated_at: string
  user_id: string
  google_calendar_synced_at?: string | null
  contact?: {
    first_name: string
    last_name: string
    email: string
  }
  deal?: {
    title: string
  }
  team_members?: TeamMemberAssignment[]
}

export interface TeamMemberAssignment {
  id: string
  team_member_id: string
  assigned_at: string
  assigned_by: string
  team_member: TeamMember
}

export interface BookingFormInput {
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  contact_id?: string
  deal_id?: string
}
