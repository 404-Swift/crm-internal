import type { Contact } from '@/types/contact'
import type { Deal } from '@/types/deal'
import type { Activity } from '@/types/activity'

export interface Conflict<T> {
  id: string
  field: keyof T
  supabaseValue: any
  sheetsValue: any
  record: T
}

export interface RecordConflict<T> {
  id: string
  record: T
  supabaseRecord: T | null
  sheetsRecord: T | null
  conflicts: Conflict<T>[]
  isNewInSheets: boolean
  isNewInSupabase: boolean
  isDeleted: boolean
}

export function compareContacts(
  supabaseContacts: Contact[],
  sheetsContacts: Contact[]
): RecordConflict<Contact>[] {
  const supabaseMap = new Map(supabaseContacts.map(c => [c.id, c]))
  const sheetsMap = new Map(sheetsContacts.map(c => [c.id, c]))
  const allIds = new Set([...supabaseMap.keys(), ...sheetsMap.keys()])
  
  const conflicts: RecordConflict<Contact>[] = []
  
  for (const id of allIds) {
    const supabase = supabaseMap.get(id)
    const sheets = sheetsMap.get(id)
    
    if (!supabase && !sheets) continue
    
    const fieldConflicts: Conflict<Contact>[] = []
    const record = supabase || sheets!
    
    if (supabase && sheets) {
      // Compare fields
      const fieldsToCompare: (keyof Contact)[] = [
        'email', 'first_name', 'last_name', 'company', 'phone', 'source', 'status', 'updated_at'
      ]
      
      for (const field of fieldsToCompare) {
        const supabaseVal = supabase[field]
        const sheetsVal = sheets[field]
        
        // Normalize for comparison
        const supabaseNormalized = String(supabaseVal || '').trim()
        const sheetsNormalized = String(sheetsVal || '').trim()
        
        if (supabaseNormalized !== sheetsNormalized) {
          fieldConflicts.push({
            id,
            field,
            supabaseValue: supabaseVal,
            sheetsValue: sheetsVal,
            record,
          })
        }
      }
    }
    
    conflicts.push({
      id,
      record,
      supabaseRecord: supabase || null,
      sheetsRecord: sheets || null,
      conflicts: fieldConflicts,
      isNewInSheets: !supabase && !!sheets,
      isNewInSupabase: !!supabase && !sheets,
      isDeleted: false, // We'll handle deletions separately
    })
  }
  
  return conflicts
}

export function compareDeals(
  supabaseDeals: Deal[],
  sheetsDeals: Deal[]
): RecordConflict<Deal>[] {
  const supabaseMap = new Map(supabaseDeals.map(d => [d.id, d]))
  const sheetsMap = new Map(sheetsDeals.map(d => [d.id, d]))
  const allIds = new Set([...supabaseMap.keys(), ...sheetsMap.keys()])
  
  const conflicts: RecordConflict<Deal>[] = []
  
  for (const id of allIds) {
    const supabase = supabaseMap.get(id)
    const sheets = sheetsMap.get(id)
    
    if (!supabase && !sheets) continue
    
    const fieldConflicts: Conflict<Deal>[] = []
    const record = supabase || sheets!
    
    if (supabase && sheets) {
      const fieldsToCompare: (keyof Deal)[] = [
        'title', 'contact_id', 'amount', 'stage', 'probability', 'expected_close_date', 'updated_at'
      ]
      
      for (const field of fieldsToCompare) {
        const supabaseVal = supabase[field]
        const sheetsVal = sheets[field]
        
        // Normalize for comparison
        let supabaseNormalized: string
        let sheetsNormalized: string
        
        if (typeof supabaseVal === 'number' && typeof sheetsVal === 'number') {
          supabaseNormalized = supabaseVal.toString()
          sheetsNormalized = sheetsVal.toString()
        } else {
          supabaseNormalized = String(supabaseVal || '').trim()
          sheetsNormalized = String(sheetsVal || '').trim()
        }
        
        if (supabaseNormalized !== sheetsNormalized) {
          fieldConflicts.push({
            id,
            field,
            supabaseValue: supabaseVal,
            sheetsValue: sheetsVal,
            record,
          })
        }
      }
    }
    
    conflicts.push({
      id,
      record,
      supabaseRecord: supabase || null,
      sheetsRecord: sheets || null,
      conflicts: fieldConflicts,
      isNewInSheets: !supabase && !!sheets,
      isNewInSupabase: !!supabase && !sheets,
      isDeleted: false,
    })
  }
  
  return conflicts
}

export function compareActivities(
  supabaseActivities: Activity[],
  sheetsActivities: Activity[]
): RecordConflict<Activity>[] {
  const supabaseMap = new Map(supabaseActivities.map(a => [a.id, a]))
  const sheetsMap = new Map(sheetsActivities.map(a => [a.id, a]))
  const allIds = new Set([...supabaseMap.keys(), ...sheetsMap.keys()])
  
  const conflicts: RecordConflict<Activity>[] = []
  
  for (const id of allIds) {
    const supabase = supabaseMap.get(id)
    const sheets = sheetsMap.get(id)
    
    if (!supabase && !sheets) continue
    
    const fieldConflicts: Conflict<Activity>[] = []
    const record = supabase || sheets!
    
    if (supabase && sheets) {
      const fieldsToCompare: (keyof Activity)[] = [
        'type', 'contact_id', 'deal_id', 'description', 'created_at'
      ]
      
      for (const field of fieldsToCompare) {
        const supabaseVal = supabase[field]
        const sheetsVal = sheets[field]
        
        const supabaseNormalized = String(supabaseVal || '').trim()
        const sheetsNormalized = String(sheetsVal || '').trim()
        
        if (supabaseNormalized !== sheetsNormalized) {
          fieldConflicts.push({
            id,
            field,
            supabaseValue: supabaseVal,
            sheetsValue: sheetsVal,
            record,
          })
        }
      }
    }
    
    conflicts.push({
      id,
      record,
      supabaseRecord: supabase || null,
      sheetsRecord: sheets || null,
      conflicts: fieldConflicts,
      isNewInSheets: !supabase && !!sheets,
      isNewInSupabase: !!supabase && !sheets,
      isDeleted: false,
    })
  }
  
  return conflicts
}
