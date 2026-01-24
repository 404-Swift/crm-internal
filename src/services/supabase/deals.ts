import { supabase } from './client'
import type { Deal, DealFormInput } from '@/types/deal'
import type { Database } from './types'
import { googleSheetsDealsService } from '../google-sheets/deals'
import { getSourceOfTruth } from './data-source-config'

type DealInsert = Database['public']['Tables']['deals']['Insert']
type DealUpdate = Database['public']['Tables']['deals']['Update']

export const dealsService = {
  async getAll(userId: string): Promise<Deal[]> {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email,
          company
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((deal: any) => ({
      ...deal,
      contact: deal.contact as Deal['contact'],
    })) as Deal[]
  },

  async getById(id: string, userId: string): Promise<Deal | null> {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email,
          company
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return {
      ...(data as any),
      contact: (data as any).contact as Deal['contact'],
    } as Deal
  },

  async getByStage(stage: string, userId: string): Promise<Deal[]> {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email,
          company
        )
      `)
      .eq('stage', stage)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((deal: any) => ({
      ...deal,
      contact: deal.contact as Deal['contact'],
    })) as Deal[]
  },

  async create(input: DealFormInput, userId: string): Promise<Deal> {
    const now = new Date().toISOString()
    const insert: DealInsert = {
      ...input,
      user_id: userId,
      created_at: now,
      updated_at: now,
    }

    // Write to Supabase first (fast UI update)
    const { data, error } = await supabase
      .from('deals')
      .insert(insert as any)
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email,
          company
        )
      `)
      .single()

    if (error) throw error
    
    const deal = {
      ...(data as any),
      contact: (data as any).contact as Deal['contact'],
    } as Deal

    // Write to Google Sheets immediately only if Supabase is source of truth
    // If Google Sheets is source of truth, don't auto-sync (it's just a backup)
    const sourceOfTruth = await getSourceOfTruth()
    if (sourceOfTruth === 'supabase') {
      try {
        await googleSheetsDealsService.create(deal, false)
      } catch (err) {
        console.error('Google Sheets sync failed:', err)
        // Don't throw - allow Supabase write to succeed, but log the error
      }
    }

    return deal
  },

  async update(
    id: string,
    input: Partial<DealFormInput>,
    userId: string
  ): Promise<Deal> {
    // Strip out 'contact' relation if it accidentally got passed in
    // Rename to ignoredContact to avoid variable name clashes
    const { contact: ignoredContact, ...cleanInput } = input as any

    const update: DealUpdate = {
      ...cleanInput,
      updated_at: new Date().toISOString(),
    }

    // Update Supabase first (fast UI update)
    const { data, error } = await (supabase
      .from('deals') as any)
      .update(update as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    
    // Fetch contact separately if contact_id exists
    let contact: Deal['contact'] = undefined
    if (data.contact_id) {
      try {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('first_name, last_name, email, company')
          .eq('id', data.contact_id)
          .single()
        
        if (contactData) {
          contact = contactData as Deal['contact']
        }
      } catch (contactError) {
        // Contact fetch failed, but don't fail the whole update
        console.warn(`Failed to fetch contact for deal ${id}:`, contactError)
      }
    }
    
    const deal = {
      ...(data as any),
      contact,
    } as Deal

    // Update Google Sheets immediately only if Supabase is source of truth
    // If Google Sheets is source of truth, don't auto-sync (it's just a backup)
    const sourceOfTruth = await getSourceOfTruth()
    if (sourceOfTruth === 'supabase') {
      try {
        await googleSheetsDealsService.update(deal, false)
      } catch (err) {
        console.error('Google Sheets sync failed:', err)
        // Don't throw - allow Supabase write to succeed, but log the error
      }
    }

    return deal
  },

  async delete(id: string, userId: string): Promise<void> {
    // Before deleting deal, find and delete all associated activities from Google Sheets
    // (Supabase will cascade delete activities automatically via foreign key)
    try {
      const { data: associatedActivities } = await (supabase
        .from('activities') as any)
        .select('id')
        .eq('deal_id', id)
        .eq('user_id', userId)

      if (associatedActivities && associatedActivities.length > 0) {
        const { googleSheetsActivitiesService } = await import('../google-sheets/activities')
        for (const activity of associatedActivities as Array<{ id: string }>) {
          try {
            await googleSheetsActivitiesService.delete(activity.id)
            console.log(`Cascade deleted activity ${activity.id} from Google Sheets (deal ${id} deleted)`)
          } catch (activityDeleteError) {
            console.warn(`Failed to cascade delete activity ${activity.id} from Google Sheets:`, activityDeleteError)
            // Continue deleting other activities even if one fails
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch associated activities for cascade delete:', error)
      // Continue with deal deletion even if cascade delete fails
    }

    // Delete from Supabase (this will cascade delete activities in Supabase via foreign key)
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    // Delete from Google Sheets in background
    googleSheetsDealsService.delete(id).catch((err) => {
      console.error('Background Google Sheets delete failed:', err)
    })
  },
}
