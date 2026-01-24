import { supabase } from './client'
import type { Contact, ContactFormInput } from '@/types/contact'
import type { Database } from './types'
import { googleSheetsContactsService } from '../google-sheets/contacts'
import { getSourceOfTruth } from './data-source-config'

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

    // Write to Google Sheets immediately only if Supabase is source of truth
    // If Google Sheets is source of truth, don't auto-sync (it's just a backup)
    const sourceOfTruth = await getSourceOfTruth()
    if (sourceOfTruth === 'supabase') {
      try {
        await googleSheetsContactsService.create(contact, false)
      } catch (err) {
        console.error('Google Sheets sync failed:', err)
        // Don't throw - allow Supabase write to succeed, but log the error
      }
    }

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

    // Update Google Sheets immediately only if Supabase is source of truth
    // If Google Sheets is source of truth, don't auto-sync (it's just a backup)
    const sourceOfTruth = await getSourceOfTruth()
    if (sourceOfTruth === 'supabase') {
      try {
        await googleSheetsContactsService.update(contact, false)
      } catch (err) {
        console.error('Google Sheets sync failed:', err)
        // Don't throw - allow Supabase write to succeed, but log the error
      }
    }

    return contact
  },

  async delete(id: string, userId: string): Promise<void> {
    // Before deleting contact, find and delete all associated deals and activities from Google Sheets
    // (Supabase will cascade delete them automatically via foreign key)
    try {
      // Delete associated deals
      const { data: associatedDeals } = await (supabase
        .from('deals') as any)
        .select('id')
        .eq('contact_id', id)
        .eq('user_id', userId)

      if (associatedDeals && associatedDeals.length > 0) {
        const { googleSheetsDealsService } = await import('../google-sheets/deals')
        for (const deal of associatedDeals as Array<{ id: string }>) {
          try {
            await googleSheetsDealsService.delete(deal.id)
            console.log(`Cascade deleted deal ${deal.id} from Google Sheets (contact ${id} deleted)`)
          } catch (dealDeleteError) {
            console.warn(`Failed to cascade delete deal ${deal.id} from Google Sheets:`, dealDeleteError)
            // Continue deleting other deals even if one fails
          }
        }
      }

      // Delete associated activities
      const { data: associatedActivities } = await (supabase
        .from('activities') as any)
        .select('id')
        .eq('contact_id', id)
        .eq('user_id', userId)

      if (associatedActivities && associatedActivities.length > 0) {
        const { googleSheetsActivitiesService } = await import('../google-sheets/activities')
        for (const activity of associatedActivities as Array<{ id: string }>) {
          try {
            await googleSheetsActivitiesService.delete(activity.id)
            console.log(`Cascade deleted activity ${activity.id} from Google Sheets (contact ${id} deleted)`)
          } catch (activityDeleteError) {
            console.warn(`Failed to cascade delete activity ${activity.id} from Google Sheets:`, activityDeleteError)
            // Continue deleting other activities even if one fails
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch associated records for cascade delete:', error)
      // Continue with contact deletion even if cascade delete fails
    }

    // Delete from Supabase (this will cascade delete deals in Supabase via foreign key)
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
