import { googleSheetsContactsService } from './contacts'
import { googleSheetsDealsService } from './deals'
import { googleSheetsActivitiesService } from './activities'
import { googleSheetsReadService } from './read'
import { contactsService } from '../supabase/contacts'
import { dealsService } from '../supabase/deals'
import { activitiesService } from '../supabase/activities'
import { compareContacts, compareDeals, compareActivities } from '../sync/compare'
import { resolveContactConflicts, resolveDealConflicts, resolveActivityConflicts } from '../sync/resolve'
import { getSourceOfTruth } from '../supabase/data-source-config'
import { toast } from '@/components/ui/toaster'
import type { Resolution } from '@/components/organisms/ConflictResolutionModal/ConflictResolutionModal'
import type { Contact } from '@/types/contact'
import type { Deal } from '@/types/deal'
import type { Activity } from '@/types/activity'

/**
 * Sync all existing data from Supabase to Google Sheets
 * Useful for backfilling data after setting up OAuth2
 * Only syncs if source of truth is 'google_sheets' (Supabase -> Sheets)
 */
export const syncAllDataToGoogleSheets = async (userId: string) => {
  const sourceOfTruth = await getSourceOfTruth()
  
  if (sourceOfTruth !== 'google_sheets') {
    toast.error('Sync not allowed', 'This sync is only available when Google Sheets is set as the source of truth. Please change your data source configuration in Settings.')
    throw new Error('Sync only allowed when Google Sheets is source of truth')
  }

  const results = {
    contacts: { synced: 0, failed: 0 },
    deals: { synced: 0, failed: 0 },
    activities: { synced: 0, failed: 0 },
  }

  try {
    // Ensure headers exist
    await googleSheetsContactsService.ensureHeaders()
    await googleSheetsDealsService.ensureHeaders()
    await googleSheetsActivitiesService.ensureHeaders()

    // Sync Contacts
    try {
      const contacts = await contactsService.getAll(userId)
      for (const contact of contacts) {
        try {
          await googleSheetsContactsService.create(contact)
          results.contacts.synced++
        } catch (error) {
          console.error(`Failed to sync contact ${contact.id}:`, error)
          results.contacts.failed++
        }
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }

    // Sync Deals
    try {
      const deals = await dealsService.getAll(userId)
      for (const deal of deals) {
        try {
          await googleSheetsDealsService.create(deal)
          results.deals.synced++
        } catch (error) {
          console.error(`Failed to sync deal ${deal.id}:`, error)
          results.deals.failed++
        }
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error)
    }

    // Sync Activities
    try {
      const activities = await activitiesService.getAll(userId)
      for (const activity of activities) {
        try {
          await googleSheetsActivitiesService.create(activity)
          results.activities.synced++
        } catch (error) {
          console.error(`Failed to sync activity ${activity.id}:`, error)
          results.activities.failed++
        }
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    }

    const totalSynced = results.contacts.synced + results.deals.synced + results.activities.synced
    const totalFailed = results.contacts.failed + results.deals.failed + results.activities.failed

    if (totalSynced > 0) {
      toast.success(
        'Sync completed',
        `Synced ${totalSynced} records to Google Sheets${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}`
      )
    }

    return results
  } catch (error) {
    console.error('Sync failed:', error)
    toast.error('Sync failed', 'Failed to sync data to Google Sheets. Please check your configuration.')
    throw error
  }
}

/**
 * Sync a single contact to Google Sheets
 */
export const syncContactToGoogleSheets = async (contactId: string, userId: string) => {
  try {
    const contact = await contactsService.getById(contactId, userId)
    if (contact) {
      await googleSheetsContactsService.update(contact)
      return true
    }
    return false
  } catch (error) {
    console.error(`Failed to sync contact ${contactId}:`, error)
    return false
  }
}

/**
 * Sync a single deal to Google Sheets
 */
export const syncDealToGoogleSheets = async (dealId: string, userId: string) => {
  try {
    const deal = await dealsService.getById(dealId, userId)
    if (deal) {
      await googleSheetsDealsService.update(deal)
      return true
    }
    return false
  } catch (error) {
    console.error(`Failed to sync deal ${dealId}:`, error)
    return false
  }
}

/**
 * Sync data from Google Sheets to Supabase
 * Automatically resolves conflicts by prioritizing Sheets data for new or conflicting records
 * Only syncs if source of truth is 'supabase' (Sheets -> Supabase)
 */
export const syncFromGoogleSheets = async (userId: string) => {
  const sourceOfTruth = await getSourceOfTruth()
  
  if (sourceOfTruth !== 'supabase') {
    toast.error('Sync not allowed', 'This sync is only available when Supabase is set as the source of truth. Please change your data source configuration in Settings.')
    throw new Error('Sync only allowed when Supabase is source of truth')
  }

  const results = {
    contacts: { synced: 0, failed: 0 },
    deals: { synced: 0, failed: 0 },
    activities: { synced: 0, failed: 0 },
  }

  try {
    // Fetch data from both sources
    const [supabaseContacts, sheetsContacts] = await Promise.all([
      contactsService.getAll(userId),
      googleSheetsReadService.getAllContacts().catch(() => [] as Contact[]),
    ])

    const [supabaseDeals, sheetsDeals] = await Promise.all([
      dealsService.getAll(userId),
      googleSheetsReadService.getAllDeals().catch(() => [] as Deal[]),
    ])

    const [supabaseActivities, sheetsActivities] = await Promise.all([
      activitiesService.getAll(userId),
      googleSheetsReadService.getAllActivities().catch(() => [] as Activity[]),
    ])

    // Compare and find conflicts
    const contactConflicts = compareContacts(supabaseContacts, sheetsContacts)
    const dealConflicts = compareDeals(supabaseDeals, sheetsDeals)
    const activityConflicts = compareActivities(supabaseActivities, sheetsActivities)

    // Auto-resolve conflicts by prioritizing Sheets data
    // For new records in Sheets or conflicts, use Sheets data
    const contactResolutions: Resolution<Contact>[] = contactConflicts
      .filter((conflict) => conflict.isNewInSheets || conflict.conflicts.length > 0)
      .map((conflict) => ({
        recordId: conflict.id,
        action: 'use-sheets' as const,
        fieldResolutions: {},
      }))

    const dealResolutions: Resolution<Deal>[] = dealConflicts
      .filter((conflict) => conflict.isNewInSheets || conflict.conflicts.length > 0)
      .map((conflict) => ({
        recordId: conflict.id,
        action: 'use-sheets' as const,
        fieldResolutions: {},
      }))

    const activityResolutions: Resolution<Activity>[] = activityConflicts
      .filter((conflict) => conflict.isNewInSheets || conflict.conflicts.length > 0)
      .map((conflict) => ({
        recordId: conflict.id,
        action: 'use-sheets' as const,
        fieldResolutions: {},
      }))

    // Resolve contacts
    if (contactResolutions.length > 0) {
      try {
        await resolveContactConflicts(contactResolutions, contactConflicts, userId)
        results.contacts.synced = contactResolutions.length
      } catch (error) {
        console.error('Failed to resolve contact conflicts:', error)
        results.contacts.failed = contactResolutions.length
      }
    }

    // Resolve deals
    if (dealResolutions.length > 0) {
      try {
        await resolveDealConflicts(dealResolutions, dealConflicts, userId)
        results.deals.synced = dealResolutions.length
      } catch (error) {
        console.error('Failed to resolve deal conflicts:', error)
        results.deals.failed = dealResolutions.length
      }
    }

    // Resolve activities
    if (activityResolutions.length > 0) {
      try {
        await resolveActivityConflicts(activityResolutions, activityConflicts, userId)
        results.activities.synced = activityResolutions.length
      } catch (error) {
        console.error('Failed to resolve activity conflicts:', error)
        results.activities.failed = activityResolutions.length
      }
    }

    const totalSynced = results.contacts.synced + results.deals.synced + results.activities.synced
    const totalFailed = results.contacts.failed + results.deals.failed + results.activities.failed

    if (totalSynced > 0 || totalFailed > 0) {
      toast.success(
        'Sync from Sheets completed',
        `Synced ${totalSynced} records from Google Sheets to Supabase${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}`
      )
    } else {
      toast.success('Sync from Sheets completed', 'All data is already in sync')
    }

    return results
  } catch (error) {
    console.error('Sync from Sheets failed:', error)
    toast.error('Sync failed', 'Failed to sync data from Google Sheets. Please check your configuration.')
    throw error
  }
}
