export interface Deal {
  id: string
  title: string
  contact_id: string
  amount: number
  stage: string
  probability: number
  expected_close_date?: string
  created_at: string
  updated_at: string
  user_id: string
  contact?: {
    first_name: string
    last_name: string
    email: string
    company?: string
  }
}

export interface DealFormInput {
  title: string
  contact_id: string
  amount: number
  stage: string
  probability: number
  expected_close_date?: string
}
