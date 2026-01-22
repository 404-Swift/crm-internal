import { supabase } from './client'
import type { Contact, ContactFormInput } from '@/types/contact'
import type { Database } from './types'
import { googleSheetsContactsService } from '../google-sheets/contacts'

type ContactRow = Database['public']['Tables']['contacts']['Row']
type ContactInsert = Database['public']['Tables']['contacts']['Insert']
type ContactUpdate = Database['public']['Tables']['contacts']['Update']

export const contactsService = {
  async getAll(userId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as ContactRow[]) as Contact[]
  },

  async getById(id: string, userId: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return (data as ContactRow) as Contact
  },

  async create(input: ContactFormInput, userId: string): Promise<Contact> {
    const now = new Date().toISOString()
    const insert: ContactInsert = {
      ...input,
      user_id: userId,
      created_at: now,
      updated_at: now,
    }

    // Write to Supabase first (fast UI update)
    const { data, error } = await supabase
      .from('contacts')
      .insert(insert as any)
      .select()
      .single()

    if (error) throw error
    
    const contact = (data as ContactRow) as Contact

    // Write to Google Sheets in background (source of truth)
    // Don't await - let it run async, but handle errors gracefully
    googleSheetsContactsService.create(contact).catch((err) => {
      console.error('Background Google Sheets sync failed:', err)
    })

    return contact
  },

  async update(
    id: string,
    input: Partial<ContactFormInput>,
    userId: string
  ): Promise<Contact> {
    const update: ContactUpdate = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    // Update Supabase first (fast UI update)
    const { data, error } = await (supabase
      .from('contacts') as any)
      .update(update as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    
    const contact = (data as ContactRow) as Contact

    // Update Google Sheets in background (source of truth)
    googleSheetsContactsService.update(contact).catch((err) => {
      console.error('Background Google Sheets sync failed:', err)
    })

    return contact
  },

  async delete(id: string, userId: string): Promise<void> {
    // Delete from Supabase first
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    // Delete from Google Sheets in background
    googleSheetsContactsService.delete(id).catch((err) => {
      console.error('Background Google Sheets delete failed:', err)
    })
  },

  async search(query: string, userId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as ContactRow[]) as Contact[]
  },
}
