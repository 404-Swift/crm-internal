export interface Activity {
  id: string
  type: string
  contact_id?: string
  deal_id?: string
  description: string
  created_at: string
  user_id: string
  contact?: {
    first_name: string
    last_name: string
  }
  deal?: {
    title: string
  }
}

export interface ActivityFormInput {
  type: string
  contact_id?: string
  deal_id?: string
  description: string
}
