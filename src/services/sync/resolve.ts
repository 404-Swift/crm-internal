import { contactsService } from '../supabase/contacts'
import { dealsService } from '../supabase/deals'
import { activitiesService } from '../supabase/activities'
import { googleSheetsReadService } from '../google-sheets/read'
import { googleSheetsContactsService } from '../google-sheets/contacts'
import { googleSheetsDealsService } from '../google-sheets/deals'
import { googleSheetsActivitiesService } from '../google-sheets/activities'
import type { Contact, ContactFormInput } from '@/types/contact'
import type { Deal, DealFormInput } from '@/types/deal'
import type { Activity } from '@/types/activity'
import type { Resolution } from '@/components/organisms/ConflictResolutionModal/ConflictResolutionModal'
import type { RecordConflict } from './compare'

export async function resolveContactConflicts(
  resolutions: Resolution<Contact>[],
  conflicts: RecordConflict<Contact>[],
  userId: string
): Promise<void> {
  // Get all sheets contacts for reference
  const sheetsContacts = await googleSheetsReadService.getAllContacts().catch(() => [] as Contact[])
  const sheetsMap = new Map(sheetsContacts.map(c => [c.id, c]))

  for (const resolution of resolutions) {
    try {
      if (resolution.action === 'skip') continue

      const conflict = conflicts.find(c => c.id === resolution.recordId)
      if (!conflict) continue

      let resolvedContact: Partial<ContactFormInput> = {}
      const supabaseContact = conflict.supabaseRecord
      const sheetsContact = conflict.sheetsRecord || sheetsMap.get(resolution.recordId)

      if (resolution.action === 'use-sheets' && sheetsContact) {
        // Use entire sheets record
        resolvedContact = {
          email: sheetsContact.email,
          first_name: sheetsContact.first_name,
          last_name: sheetsContact.last_name,
          company: sheetsContact.company,
          phone: sheetsContact.phone,
          source: sheetsContact.source,
          status: sheetsContact.status,
        }
      } else if (resolution.action === 'use-supabase' && supabaseContact) {
        // Use entire supabase record (already in Supabase, just sync to Sheets)
        resolvedContact = {
          email: supabaseContact.email,
          first_name: supabaseContact.first_name,
          last_name: supabaseContact.last_name,
          company: supabaseContact.company,
          phone: supabaseContact.phone,
          source: supabaseContact.source,
          status: supabaseContact.status,
        }
      } else if (resolution.action === 'merge' && resolution.fieldResolutions && supabaseContact && sheetsContact) {
        // Merge fields based on user selection
        const baseContact = { ...supabaseContact }
        Object.entries(resolution.fieldResolutions).forEach(([field, source]) => {
          const fieldKey = field as keyof Contact
          if (source === 'sheets' && sheetsContact[fieldKey] !== undefined) {
            (resolvedContact as any)[fieldKey] = sheetsContact[fieldKey]
          } else if (source === 'supabase' && baseContact[fieldKey] !== undefined) {
            (resolvedContact as any)[fieldKey] = baseContact[fieldKey]
          }
        })
        // Include all other fields from supabase
        Object.keys(baseContact).forEach(key => {
          if (!(key in resolvedContact)) {
            (resolvedContact as any)[key] = (baseContact as any)[key]
          }
        })
      } else if (conflict.isNewInSheets && sheetsContact && resolution.action === 'use-sheets') {
        // New record in Sheets - create in Supabase with same ID
        const { supabase } = await import('../supabase/client')
        const now = new Date().toISOString()
        const { error } = await supabase
          .from('contacts')
          .insert({
            id: sheetsContact.id, // Preserve ID from Sheets
            email: sheetsContact.email,
            first_name: sheetsContact.first_name,
            last_name: sheetsContact.last_name,
            company: sheetsContact.company,
            phone: sheetsContact.phone,
            source: sheetsContact.source,
            status: sheetsContact.status,
            user_id: userId,
            created_at: sheetsContact.created_at || now,
            updated_at: sheetsContact.updated_at || now,
          } as any)
          .select()
          .single()
        
        if (error) {
          // If ID conflict, try without ID (let Supabase generate)
          if (error.code === '23505') {
            const created = await contactsService.create({
              email: sheetsContact.email,
              first_name: sheetsContact.first_name,
              last_name: sheetsContact.last_name,
              company: sheetsContact.company,
              phone: sheetsContact.phone,
              source: sheetsContact.source,
              status: sheetsContact.status,
            }, userId)
            // Update Sheets row with new Supabase ID
            await googleSheetsContactsService.update({ ...created, id: sheetsContact.id } as Contact)
          } else {
            throw error
          }
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseContact && resolution.action === 'use-supabase') {
        // New record in Supabase - sync to Sheets
        await googleSheetsContactsService.create(supabaseContact)
        continue
      }

      if (Object.keys(resolvedContact).length > 0 && supabaseContact) {
        // Update in Supabase
        await contactsService.update(resolution.recordId, resolvedContact, userId)
        
        // Construct complete contact object with resolved values to ensure both sides have identical values
        const resolvedContactComplete: Contact = {
          ...supabaseContact,
          ...resolvedContact,
          id: resolution.recordId,
          user_id: supabaseContact.user_id,
          created_at: supabaseContact.created_at,
          updated_at: new Date().toISOString(),
        }
        
        // Sync the exact resolved values to Google Sheets
        await googleSheetsContactsService.update(resolvedContactComplete)
      }
    } catch (error) {
      console.error(`Failed to resolve contact ${resolution.recordId}:`, error)
    }
  }
}

export async function resolveDealConflicts(
  resolutions: Resolution<Deal>[],
  conflicts: RecordConflict<Deal>[],
  userId: string
): Promise<void> {
  const sheetsDeals = await googleSheetsReadService.getAllDeals().catch(() => [] as Deal[])
  const sheetsMap = new Map(sheetsDeals.map(d => [d.id, d]))

  for (const resolution of resolutions) {
    try {
      if (resolution.action === 'skip') continue

      const conflict = conflicts.find(c => c.id === resolution.recordId)
      if (!conflict) continue

      let resolvedDeal: Partial<DealFormInput> = {}
      const supabaseDeal = conflict.supabaseRecord
      const sheetsDeal = conflict.sheetsRecord || sheetsMap.get(resolution.recordId)

      if (resolution.action === 'use-sheets' && sheetsDeal) {
        resolvedDeal = {
          title: sheetsDeal.title,
          contact_id: sheetsDeal.contact_id,
          amount: sheetsDeal.amount,
          stage: sheetsDeal.stage,
          probability: sheetsDeal.probability,
          expected_close_date: sheetsDeal.expected_close_date,
        }
      } else if (resolution.action === 'use-supabase' && supabaseDeal) {
        resolvedDeal = {
          title: supabaseDeal.title,
          contact_id: supabaseDeal.contact_id,
          amount: supabaseDeal.amount,
          stage: supabaseDeal.stage,
          probability: supabaseDeal.probability,
          expected_close_date: supabaseDeal.expected_close_date,
        }
      } else if (resolution.action === 'merge' && resolution.fieldResolutions && supabaseDeal && sheetsDeal) {
        const baseDeal = { ...supabaseDeal }
        Object.entries(resolution.fieldResolutions).forEach(([field, source]) => {
          const fieldKey = field as keyof Deal
          if (source === 'sheets' && sheetsDeal[fieldKey] !== undefined) {
            (resolvedDeal as any)[fieldKey] = sheetsDeal[fieldKey]
          } else if (source === 'supabase' && baseDeal[fieldKey] !== undefined) {
            (resolvedDeal as any)[fieldKey] = baseDeal[fieldKey]
          }
        })
        Object.keys(baseDeal).forEach(key => {
          if (!(key in resolvedDeal)) {
            (resolvedDeal as any)[key] = (baseDeal as any)[key]
          }
        })
      } else if (conflict.isNewInSheets && sheetsDeal && resolution.action === 'use-sheets') {
        // New record in Sheets - create in Supabase with same ID
        const { supabase } = await import('../supabase/client')
        const now = new Date().toISOString()
        const { error } = await supabase
          .from('deals')
          .insert({
            id: sheetsDeal.id, // Preserve ID from Sheets
            title: sheetsDeal.title,
            contact_id: sheetsDeal.contact_id,
            amount: sheetsDeal.amount,
            stage: sheetsDeal.stage,
            probability: sheetsDeal.probability,
            expected_close_date: sheetsDeal.expected_close_date,
            user_id: userId,
            created_at: sheetsDeal.created_at || now,
            updated_at: sheetsDeal.updated_at || now,
          } as any)
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
        
        if (error) {
          // If ID conflict, try without ID
          if (error.code === '23505') {
            const created = await dealsService.create({
              title: sheetsDeal.title,
              contact_id: sheetsDeal.contact_id,
              amount: sheetsDeal.amount,
              stage: sheetsDeal.stage,
              probability: sheetsDeal.probability,
              expected_close_date: sheetsDeal.expected_close_date,
            }, userId)
            // Update Sheets row with new Supabase ID
            await googleSheetsDealsService.update({ ...created, id: sheetsDeal.id } as Deal)
          } else {
            throw error
          }
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseDeal && resolution.action === 'use-supabase') {
        await googleSheetsDealsService.create(supabaseDeal)
        continue
      }

      if (Object.keys(resolvedDeal).length > 0 && supabaseDeal) {
        await dealsService.update(resolution.recordId, resolvedDeal, userId)
        
        // Construct complete deal object with resolved values to ensure both sides have identical values
        const resolvedDealComplete: Deal = {
          ...supabaseDeal,
          ...resolvedDeal,
          id: resolution.recordId,
          user_id: supabaseDeal.user_id,
          created_at: supabaseDeal.created_at,
          updated_at: new Date().toISOString(),
          contact: supabaseDeal.contact, // Preserve contact relation
        }
        
        // Sync the exact resolved values to Google Sheets
        await googleSheetsDealsService.update(resolvedDealComplete)
      }
    } catch (error) {
      console.error(`Failed to resolve deal ${resolution.recordId}:`, error)
    }
  }
}

export async function resolveActivityConflicts(
  resolutions: Resolution<Activity>[],
  conflicts: RecordConflict<Activity>[],
  userId: string
): Promise<void> {
  const sheetsActivities = await googleSheetsReadService.getAllActivities().catch(() => [] as Activity[])
  const sheetsMap = new Map(sheetsActivities.map(a => [a.id, a]))

  for (const resolution of resolutions) {
    try {
      if (resolution.action === 'skip') continue

      const conflict = conflicts.find(c => c.id === resolution.recordId)
      if (!conflict) continue

      const supabaseActivity = conflict.supabaseRecord
      const sheetsActivity = conflict.sheetsRecord || sheetsMap.get(resolution.recordId)

      if (conflict.isNewInSheets && sheetsActivity && resolution.action === 'use-sheets') {
        // New in Sheets - create in Supabase with same ID
        const { supabase } = await import('../supabase/client')
        const { error } = await supabase
          .from('activities')
          .insert({
            id: sheetsActivity.id,
            type: sheetsActivity.type,
            contact_id: sheetsActivity.contact_id,
            deal_id: sheetsActivity.deal_id,
            description: sheetsActivity.description,
            user_id: userId,
            created_at: sheetsActivity.created_at || new Date().toISOString(),
          } as any)
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
        
        if (error) {
          // If ID conflict, try without ID
          if (error.code === '23505') {
            await activitiesService.create({
              type: sheetsActivity.type,
              contact_id: sheetsActivity.contact_id,
              deal_id: sheetsActivity.deal_id,
              description: sheetsActivity.description,
            }, userId)
          } else {
            throw error
          }
        }
      } else if (conflict.isNewInSupabase && supabaseActivity && resolution.action === 'use-supabase') {
        // New in Supabase - sync to Sheets
        await googleSheetsActivitiesService.create(supabaseActivity)
      } else if (supabaseActivity && sheetsActivity && (resolution.action === 'use-supabase' || resolution.action === 'use-sheets' || resolution.action === 'merge')) {
        // Both exist - use the one specified
        if (resolution.action === 'use-sheets') {
          // Update Supabase with Sheets data (delete and recreate)
          await activitiesService.delete(supabaseActivity.id, userId)
          await activitiesService.create({
            type: sheetsActivity.type,
            contact_id: sheetsActivity.contact_id,
            deal_id: sheetsActivity.deal_id,
            description: sheetsActivity.description,
          }, userId)
        } else if (resolution.action === 'use-supabase') {
          // Sync Supabase to Sheets
          await googleSheetsActivitiesService.create(supabaseActivity)
        }
      }
    } catch (error) {
      console.error(`Failed to resolve activity ${resolution.recordId}:`, error)
    }
  }
}
