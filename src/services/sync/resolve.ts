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

      // Check for new records in Sheets FIRST, before general use-sheets case
      if (conflict.isNewInSheets && sheetsContact && resolution.action === 'use-sheets') {
        // New record in Sheets - create in Supabase with same ID
        const { supabase } = await import('../supabase/client')
        const now = new Date().toISOString()
        const { data: insertedContact, error } = await supabase
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
            try {
              await googleSheetsContactsService.update({ ...created, id: sheetsContact.id } as Contact, false)
            } catch (syncError) {
              console.error(`Failed to sync contact to Google Sheets after creation:`, syncError)
              // Don't throw - the record was created in Supabase
            }
          } else {
            const errorMessage = error.message || String(error)
            throw new Error(`Failed to create contact in Supabase: ${errorMessage}`)
          }
        } else if (insertedContact) {
          // Successfully created - ensure Sheets has the correct data
          try {
            await googleSheetsContactsService.update(insertedContact as Contact, false)
          } catch (syncError) {
            console.warn(`Failed to sync contact back to Google Sheets:`, syncError)
            // Don't throw - the record was created successfully
          }
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseContact && resolution.action === 'use-supabase') {
        // New record in Supabase - sync to Sheets
        await googleSheetsContactsService.create(supabaseContact)
        continue
      } else if (conflict.isNewInSupabase && supabaseContact && resolution.action === 'use-sheets' && !sheetsContact) {
        // Record was deleted from Sheets - delete from Supabase too
        await contactsService.delete(resolution.recordId, userId)
        continue
      } else if (resolution.action === 'use-sheets' && sheetsContact) {
        // Use entire sheets record (for existing records with differences)
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
        try {
          await googleSheetsContactsService.update(resolvedContactComplete, false)
        } catch (syncError) {
          console.error(`Failed to sync contact ${resolution.recordId} to Google Sheets:`, syncError)
          // Re-throw to ensure user knows sync failed
          throw new Error(`Failed to sync contact to Google Sheets: ${syncError instanceof Error ? syncError.message : String(syncError)}`)
        }
      }
    } catch (error) {
      console.error(`Failed to resolve contact ${resolution.recordId}:`, error)
      // Re-throw to show error to user
      throw error
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

      // Check for new records in Sheets FIRST, before general use-sheets case
      if (conflict.isNewInSheets && sheetsDeal && resolution.action === 'use-sheets') {
        // New record in Sheets - create in Supabase with same ID
        const { supabase } = await import('../supabase/client')
        const now = new Date().toISOString()
        const { data: insertedDeal, error } = await supabase
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
          .select('*')
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
            try {
              await googleSheetsDealsService.update({ ...created, id: sheetsDeal.id } as Deal, false)
            } catch (syncError) {
              console.error(`Failed to sync deal to Google Sheets after creation:`, syncError)
              const errorMessage = syncError instanceof Error ? syncError.message : String(syncError)
              throw new Error(`Failed to sync deal to Google Sheets: ${errorMessage}`)
            }
          } else {
            const errorMessage = error.message || String(error)
            throw new Error(`Failed to create deal in Supabase: ${errorMessage}`)
          }
        } else if (insertedDeal) {
          // Successfully created - ensure Sheets has the correct data
          try {
            // Fetch contact separately if needed
            let contact: Deal['contact'] = undefined
            const dealData = insertedDeal as any
            if (dealData.contact_id) {
              const { data: contactData } = await supabase
                .from('contacts')
                .select('first_name, last_name, email, company')
                .eq('id', dealData.contact_id)
                .single()
              
              if (contactData) {
                contact = contactData as Deal['contact']
              }
            }
            
            const completeDeal: Deal = {
              ...dealData,
              contact,
            } as Deal
            
            // Update Sheets to ensure it has the exact same data as Supabase
            await googleSheetsDealsService.update(completeDeal, false)
          } catch (syncError) {
            console.warn(`Failed to sync deal back to Google Sheets:`, syncError)
            // Don't throw - the record was created successfully
          }
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseDeal && resolution.action === 'use-supabase') {
        // New record in Supabase - sync to Sheets
        try {
          await googleSheetsDealsService.create(supabaseDeal, false)
        } catch (syncError) {
          console.error(`Failed to sync new deal ${resolution.recordId} to Google Sheets:`, syncError)
          const errorMessage = syncError instanceof Error ? syncError.message : String(syncError)
          throw new Error(`Failed to sync deal to Google Sheets: ${errorMessage}`)
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseDeal && resolution.action === 'use-sheets' && !sheetsDeal) {
        // Record was deleted from Sheets - delete from Supabase too
        await dealsService.delete(resolution.recordId, userId)
        continue
      } else if (resolution.action === 'use-sheets' && sheetsDeal) {
        // Extract only the fields that can be updated (exclude relations and metadata)
        const { contact, created_at, updated_at, user_id, id, ...dealData } = sheetsDeal as any
        resolvedDeal = {
          title: dealData.title,
          contact_id: dealData.contact_id,
          amount: dealData.amount,
          stage: dealData.stage,
          probability: dealData.probability,
          expected_close_date: dealData.expected_close_date,
        }
      } else if (resolution.action === 'use-supabase' && supabaseDeal) {
        // Extract only the fields that can be updated (exclude relations and metadata)
        const { contact, created_at, updated_at, user_id, id, ...dealData } = supabaseDeal as any
        resolvedDeal = {
          title: dealData.title,
          contact_id: dealData.contact_id,
          amount: dealData.amount,
          stage: dealData.stage,
          probability: dealData.probability,
          expected_close_date: dealData.expected_close_date,
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
        // Exclude 'contact' relation and timestamp metadata from the update payload
        Object.keys(baseDeal).forEach(key => {
          if (key !== 'contact' && key !== 'created_at' && key !== 'updated_at' && !(key in resolvedDeal)) {
            (resolvedDeal as any)[key] = (baseDeal as any)[key]
          }
        })
      }

      if (Object.keys(resolvedDeal).length > 0 && supabaseDeal) {
        try {
          // Validate contact_id exists if it's being updated
          if (resolvedDeal.contact_id && resolvedDeal.contact_id !== supabaseDeal.contact_id) {
            const { contactsService } = await import('../supabase/contacts')
            const contact = await contactsService.getById(resolvedDeal.contact_id, userId)
            if (!contact) {
              throw new Error(`Contact with ID ${resolvedDeal.contact_id} does not exist. Please ensure the contact exists in Supabase before syncing.`)
            }
          }

          // Update in Supabase first
          const updatedDeal = await dealsService.update(resolution.recordId, resolvedDeal, userId)
          
          // Construct complete deal object with resolved values to ensure both sides have identical values
          const resolvedDealComplete: Deal = {
            ...updatedDeal,
            ...resolvedDeal,
            id: resolution.recordId,
            user_id: updatedDeal.user_id,
            created_at: updatedDeal.created_at,
            updated_at: new Date().toISOString(),
            contact: updatedDeal.contact, // Preserve contact relation
          }
          
          // Sync the exact resolved values to Google Sheets
          try {
            await googleSheetsDealsService.update(resolvedDealComplete, false)
          } catch (syncError) {
            console.error(`Failed to sync deal ${resolution.recordId} to Google Sheets:`, syncError)
            const errorMessage = syncError instanceof Error ? syncError.message : String(syncError)
            // Check if it's an auth error
            if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
              throw new Error(`Google Sheets authentication failed. Please reconnect Google Sheets in Settings.`)
            }
            throw new Error(`Failed to sync deal "${supabaseDeal.title || resolution.recordId}" to Google Sheets: ${errorMessage}`)
          }
        } catch (updateError: any) {
          console.error(`Failed to update deal ${resolution.recordId} in Supabase:`, updateError)
          let errorMessage = updateError instanceof Error ? updateError.message : String(updateError)
          
          // Provide more helpful error messages for common issues
          if (updateError?.code === '23503') {
            errorMessage = `Invalid contact reference. The contact ID "${resolvedDeal.contact_id}" does not exist in Supabase.`
          } else if (updateError?.code === '23505') {
            errorMessage = `Duplicate deal detected. A deal with this information already exists.`
          } else if (updateError?.code === 'PGRST116') {
            errorMessage = `Deal not found. It may have been deleted.`
          } else if (updateError?.message) {
            errorMessage = updateError.message
          }
          
          throw new Error(`Failed to update deal "${supabaseDeal.title || resolution.recordId}": ${errorMessage}`)
        }
      } else {
        console.warn(`No resolved data for deal ${resolution.recordId}, skipping`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Failed to resolve deal ${resolution.recordId}:`, errorMessage, error)
      throw new Error(`Failed to resolve deal: ${errorMessage}`)
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
        const now = new Date().toISOString()
        const { data: insertedActivity, error } = await (supabase
          .from('activities') as any)
          .insert({
            id: sheetsActivity.id,
            type: sheetsActivity.type,
            contact_id: sheetsActivity.contact_id,
            deal_id: sheetsActivity.deal_id,
            description: sheetsActivity.description,
            user_id: userId,
            created_at: sheetsActivity.created_at || now,
          } as any)
          .select('*')
          .single()
        
        if (error) {
          // If ID conflict, try without ID (let Supabase generate)
          if (error.code === '23505') {
            const created = await activitiesService.create({
              type: sheetsActivity.type,
              contact_id: sheetsActivity.contact_id,
              deal_id: sheetsActivity.deal_id,
              description: sheetsActivity.description,
            }, userId)
            // Update Sheets row with new Supabase ID to keep them in sync
            // Note: Activities service doesn't have update, so we'll create it (it will skip if exists)
            try {
              await googleSheetsActivitiesService.create({ ...created, id: sheetsActivity.id } as Activity, false)
            } catch (syncError) {
              console.error(`Failed to sync activity to Google Sheets after creation:`, syncError)
              // Don't throw - the record was created in Supabase, which is the main goal
            }
          } else {
            const errorMessage = error.message || String(error)
            throw new Error(`Failed to create activity in Supabase: ${errorMessage}`)
          }
        } else if (insertedActivity) {
          // Successfully created - ensure Sheets has the correct data
          try {
            // Fetch relations separately if needed
            let contact: Activity['contact'] = undefined
            let deal: Activity['deal'] = undefined
            
            const activityData = insertedActivity as any
            if (activityData && activityData.contact_id) {
              const { data: contactData } = await supabase
                .from('contacts')
                .select('first_name, last_name')
                .eq('id', activityData.contact_id)
                .single()
              
              if (contactData) {
                contact = contactData as Activity['contact']
              }
            }
            
            if (activityData && activityData.deal_id) {
              const { data: dealData } = await supabase
                .from('deals')
                .select('title')
                .eq('id', activityData.deal_id)
                .single()
              
              if (dealData) {
                deal = dealData as Activity['deal']
              }
            }
            
            const completeActivity: Activity = {
              ...activityData,
              contact,
              deal,
            } as Activity
            
            // Activities service doesn't have update, so we'll create it (it will skip if exists)
            await googleSheetsActivitiesService.create(completeActivity, false)
          } catch (syncError) {
            console.warn(`Failed to sync activity back to Google Sheets:`, syncError)
            // Don't throw - the record was created successfully
          }
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseActivity && resolution.action === 'use-supabase') {
        // New in Supabase - sync to Sheets
        try {
          await googleSheetsActivitiesService.create(supabaseActivity, false)
        } catch (syncError) {
          console.error(`Failed to sync activity to Google Sheets:`, syncError)
          throw new Error(`Failed to sync activity to Google Sheets: ${syncError instanceof Error ? syncError.message : String(syncError)}`)
        }
        continue
      } else if (conflict.isNewInSupabase && supabaseActivity && resolution.action === 'use-sheets' && !sheetsActivity) {
        // Record was deleted from Sheets - delete from Supabase too
        await activitiesService.delete(supabaseActivity.id, userId)
        continue
      } else if (supabaseActivity && sheetsActivity && (resolution.action === 'use-supabase' || resolution.action === 'use-sheets' || resolution.action === 'merge')) {
        // Both exist - use the one specified
        if (resolution.action === 'use-sheets') {
          // Update Supabase with Sheets data (delete and recreate)
          await activitiesService.delete(supabaseActivity.id, userId)
          const newActivity = await activitiesService.create({
            type: sheetsActivity.type,
            contact_id: sheetsActivity.contact_id,
            deal_id: sheetsActivity.deal_id,
            description: sheetsActivity.description,
          }, userId)
          // Sync to Sheets to ensure consistency
          try {
            await googleSheetsActivitiesService.create(newActivity, false)
          } catch (syncError) {
            console.error(`Failed to sync activity to Google Sheets:`, syncError)
            throw new Error(`Failed to sync activity to Google Sheets: ${syncError instanceof Error ? syncError.message : String(syncError)}`)
          }
        } else if (resolution.action === 'use-supabase') {
          // Sync Supabase to Sheets
          try {
            await googleSheetsActivitiesService.create(supabaseActivity, false)
          } catch (syncError) {
            console.error(`Failed to sync activity to Google Sheets:`, syncError)
            throw new Error(`Failed to sync activity to Google Sheets: ${syncError instanceof Error ? syncError.message : String(syncError)}`)
          }
        }
      }
    } catch (error) {
      console.error(`Failed to resolve activity ${resolution.recordId}:`, error)
      throw error
    }
  }
}
