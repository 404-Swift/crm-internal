export interface TeamMember {
  id: string
  user_id?: string | null
  name: string
  email: string
  role?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMemberFormInput {
  user_id?: string
  name: string
  email: string
  role?: string
  is_active?: boolean
}
