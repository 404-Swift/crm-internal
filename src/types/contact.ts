export interface Contact {
  id: string
  email: string
  first_name: string
  last_name: string
  company?: string
  phone?: string
  source?: string
  status?: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface ContactFormInput {
  email: string
  first_name: string
  last_name: string
  company?: string
  phone?: string
  source?: string
  status?: string
}
