import { supabase } from './client'
import type { Activity, ActivityFormInput } from '@/types/activity'
import type { Database } from './types'
import { googleSheetsActivitiesService } from '../google-sheets/activities'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']

export const activitiesService = {
  async getAll(userId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name
        ),
        deal:deals (
          title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((activity: any) => ({
      ...activity,
      contact: activity.contact as Activity['contact'],
      deal: activity.deal as Activity['deal'],
    })) as Activity[]
  },

  async getByContact(contactId: string, userId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name
        ),
        deal:deals (
          title
        )
      `)
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((activity: any) => ({
      ...activity,
      contact: activity.contact as Activity['contact'],
      deal: activity.deal as Activity['deal'],
    })) as Activity[]
  },

  async getByDeal(dealId: string, userId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name
        ),
        deal:deals (
          title
        )
      `)
      .eq('deal_id', dealId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((activity: any) => ({
      ...activity,
      contact: activity.contact as Activity['contact'],
      deal: activity.deal as Activity['deal'],
    })) as Activity[]
  },

  async create(input: ActivityFormInput, userId: string): Promise<Activity> {
    const insert: ActivityInsert = {
      ...input,
      user_id: userId,
      created_at: new Date().toISOString(),
    }

    // Write to Supabase first (fast UI update)
    const { data, error } = await supabase
      .from('activities')
      .insert(insert as any)
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name
        ),
        deal:deals (
          title
        )
      `)
      .single()

    if (error) throw error
    
    const activity = {
      ...(data as any),
      contact: (data as any).contact as Activity['contact'],
      deal: (data as any).deal as Activity['deal'],
    } as Activity

    // Write to Google Sheets immediately (source of truth)
    // Await to ensure sync completes before returning
    try {
      await googleSheetsActivitiesService.create(activity, false)
    } catch (err) {
      console.error('Google Sheets sync failed:', err)
      // Don't throw - allow Supabase write to succeed, but log the error
    }

    return activity
  },

  async delete(id: string, userId: string): Promise<void> {
    // Delete from Supabase first
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    // Delete from Google Sheets in background
    googleSheetsActivitiesService.delete(id).catch((err) => {
      console.error('Background Google Sheets delete failed:', err)
    })
  },
}
