import { googleSheetsContactsService } from './contacts'
import { googleSheetsDealsService } from './deals'
import { googleSheetsActivitiesService } from './activities'
import { contactsService } from '../supabase/contacts'
import { dealsService } from '../supabase/deals'
import { activitiesService } from '../supabase/activities'
import { toast } from '@/components/ui/toaster'

/**
 * Sync all existing data from Supabase to Google Sheets
 * Useful for backfilling data after setting up OAuth2
 */
export const syncAllDataToGoogleSheets = async (userId: string) => {
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
