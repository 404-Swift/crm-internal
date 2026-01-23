import { supabase } from './client'
import type { TeamMember, TeamMemberFormInput } from '@/types/team-member'
import type { Database } from './types'

type TeamMemberRow = Database['public']['Tables']['team_members']['Row']
type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']
type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update']

export const teamMembersService = {
  async getAll(): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as TeamMemberRow[]) as TeamMember[]
  },

  async getById(id: string): Promise<TeamMember | null> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return (data as TeamMemberRow) as TeamMember
  },

  async getByUserId(userId: string): Promise<TeamMember | null> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return (data as TeamMemberRow) as TeamMember
  },

  async create(input: TeamMemberFormInput, userId: string): Promise<TeamMember> {
    const now = new Date().toISOString()
    const insert: TeamMemberInsert = {
      ...input,
      user_id: userId,
      is_active: input.is_active ?? true,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('team_members')
      .insert(insert as any)
      .select()
      .single()

    if (error) throw error
    return (data as TeamMemberRow) as TeamMember
  },

  async update(
    id: string,
    input: Partial<TeamMemberFormInput>,
    userId: string
  ): Promise<TeamMember> {
    const update: TeamMemberUpdate = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('team_members')
      .update(update as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return (data as TeamMemberRow) as TeamMember
  },

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },
}
