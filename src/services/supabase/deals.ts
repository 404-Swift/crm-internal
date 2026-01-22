import { supabase } from './client'
import type { Deal, DealFormInput } from '@/types/deal'
import type { Database } from './types'
import { googleSheetsDealsService } from '../google-sheets/deals'

type DealRow = Database['public']['Tables']['deals']['Row']
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
    return data.map((deal) => ({
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
      ...data,
      contact: data.contact as Deal['contact'],
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
    return data.map((deal) => ({
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
      .insert(insert)
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
      ...data,
      contact: data.contact as Deal['contact'],
    } as Deal

    // Write to Google Sheets in background (source of truth)
    googleSheetsDealsService.create(deal).catch((err) => {
      console.error('Background Google Sheets sync failed:', err)
    })

    return deal
  },

  async update(
    id: string,
    input: Partial<DealFormInput>,
    userId: string
  ): Promise<Deal> {
    const update: DealUpdate = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    // Update Supabase first (fast UI update)
    const { data, error } = await supabase
      .from('deals')
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
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
      ...data,
      contact: data.contact as Deal['contact'],
    } as Deal

    // Update Google Sheets in background (source of truth)
    googleSheetsDealsService.update(deal).catch((err) => {
      console.error('Background Google Sheets sync failed:', err)
    })

    return deal
  },

  async delete(id: string, userId: string): Promise<void> {
    // Delete from Supabase first
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
