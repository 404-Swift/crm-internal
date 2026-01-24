import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { contactsService } from '@/services/supabase/contacts'
import { dealsService } from '@/services/supabase/deals'
import { activitiesService } from '@/services/supabase/activities'
import { googleSheetsReadService } from '@/services/google-sheets/read'
import { compareContacts, compareDeals, compareActivities } from '@/services/sync/compare'
import { resolveContactConflicts, resolveDealConflicts, resolveActivityConflicts } from '@/services/sync/resolve'
import type { RecordConflict } from '@/services/sync/compare'
import type { Contact } from '@/types/contact'
import type { Deal } from '@/types/deal'
import type { Activity } from '@/types/activity'
import type { Resolution } from '@/components/organisms/ConflictResolutionModal/ConflictResolutionModal'

export function useBidirectionalSync() {
  const { user } = useAuth()
  const [contactConflicts, setContactConflicts] = useState<RecordConflict<Contact>[]>([])
  const [dealConflicts, setDealConflicts] = useState<RecordConflict<Deal>[]>([])
  const [activityConflicts, setActivityConflicts] = useState<RecordConflict<Activity>[]>([])

  const compareMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated')

      // Fetch from both sources
      // If Google Sheets read fails (no OAuth2), just use empty arrays
      const [supabaseContacts, sheetsContacts] = await Promise.all([
        contactsService.getAll(user.id),
        googleSheetsReadService.getAllContacts().catch((error) => {
          console.warn('Failed to read contacts from Google Sheets (OAuth2 may not be set up):', error)
          return [] as Contact[]
        }),
      ])

      const [supabaseDeals, sheetsDeals] = await Promise.all([
        dealsService.getAll(user.id),
        googleSheetsReadService.getAllDeals().catch((error) => {
          console.warn('Failed to read deals from Google Sheets (OAuth2 may not be set up):', error)
          return [] as Deal[]
        }),
      ])

      const [supabaseActivities, sheetsActivities] = await Promise.all([
        activitiesService.getAll(user.id),
        googleSheetsReadService.getAllActivities().catch((error) => {
          console.warn('Failed to read activities from Google Sheets (OAuth2 may not be set up):', error)
          return [] as Activity[]
        }),
      ])

      // Filter out orphaned deals (deals whose contact doesn't exist) and delete them
      const contactIds = new Set(supabaseContacts.map(c => c.id))
      const orphanedSupabaseDeals = supabaseDeals.filter(deal => deal.contact_id && !contactIds.has(deal.contact_id))
      const orphanedSheetsDeals = sheetsDeals.filter(deal => deal.contact_id && !contactIds.has(deal.contact_id))
      
      // Delete orphaned deals from both systems
      for (const deal of orphanedSupabaseDeals) {
        try {
          await dealsService.delete(deal.id, user.id)
          console.log(`Deleted orphaned deal ${deal.id} from Supabase - contact ${deal.contact_id} doesn't exist`)
        } catch (error) {
          console.error(`Failed to delete orphaned deal ${deal.id} from Supabase:`, error)
        }
      }
      for (const deal of orphanedSheetsDeals) {
        try {
          const { googleSheetsDealsService } = await import('@/services/google-sheets/deals')
          await googleSheetsDealsService.delete(deal.id)
          console.log(`Deleted orphaned deal ${deal.id} from Google Sheets - contact ${deal.contact_id} doesn't exist`)
        } catch (error) {
          console.error(`Failed to delete orphaned deal ${deal.id} from Google Sheets:`, error)
        }
      }
      
      const validSupabaseDeals = supabaseDeals.filter(deal => {
        if (deal.contact_id && !contactIds.has(deal.contact_id)) {
          return false
        }
        return true
      })
      const validSheetsDeals = sheetsDeals.filter(deal => {
        if (deal.contact_id && !contactIds.has(deal.contact_id)) {
          return false
        }
        return true
      })

      // Filter out orphaned activities (activities whose contact or deal doesn't exist) and delete them
      const dealIds = new Set(validSupabaseDeals.map(d => d.id))
      const orphanedSupabaseActivities = supabaseActivities.filter(activity => {
        return (activity.contact_id && !contactIds.has(activity.contact_id)) ||
               (activity.deal_id && !dealIds.has(activity.deal_id))
      })
      const orphanedSheetsActivities = sheetsActivities.filter(activity => {
        return (activity.contact_id && !contactIds.has(activity.contact_id)) ||
               (activity.deal_id && !dealIds.has(activity.deal_id))
      })
      
      // Delete orphaned activities from both systems
      for (const activity of orphanedSupabaseActivities) {
        try {
          await activitiesService.delete(activity.id, user.id)
          console.log(`Deleted orphaned activity ${activity.id} from Supabase`)
        } catch (error) {
          console.error(`Failed to delete orphaned activity ${activity.id} from Supabase:`, error)
        }
      }
      for (const activity of orphanedSheetsActivities) {
        try {
          const { googleSheetsActivitiesService } = await import('@/services/google-sheets/activities')
          await googleSheetsActivitiesService.delete(activity.id)
          console.log(`Deleted orphaned activity ${activity.id} from Google Sheets`)
        } catch (error) {
          console.error(`Failed to delete orphaned activity ${activity.id} from Google Sheets:`, error)
        }
      }
      
      const validSupabaseActivities = supabaseActivities.filter(activity => {
        if (activity.contact_id && !contactIds.has(activity.contact_id)) {
          return false
        }
        if (activity.deal_id && !dealIds.has(activity.deal_id)) {
          return false
        }
        return true
      })
      const validSheetsActivities = sheetsActivities.filter(activity => {
        if (activity.contact_id && !contactIds.has(activity.contact_id)) {
          return false
        }
        if (activity.deal_id && !dealIds.has(activity.deal_id)) {
          return false
        }
        return true
      })

      // Compare
      const contacts = compareContacts(supabaseContacts, sheetsContacts)
      const deals = compareDeals(validSupabaseDeals, validSheetsDeals)
      const activities = compareActivities(validSupabaseActivities, validSheetsActivities)

      setContactConflicts(contacts)
      setDealConflicts(deals)
      setActivityConflicts(activities)

      return { contacts, deals, activities }
    },
  })

  const resolveContactsMutation = useMutation({
    mutationFn: async (resolutions: Resolution<Contact>[]) => {
      if (!user) throw new Error('User not authenticated')
      await resolveContactConflicts(resolutions, contactConflicts, user.id)
    },
  })

  const resolveDealsMutation = useMutation({
    mutationFn: async (resolutions: Resolution<Deal>[]) => {
      if (!user) throw new Error('User not authenticated')
      await resolveDealConflicts(resolutions, dealConflicts, user.id)
    },
  })

  const resolveActivitiesMutation = useMutation({
    mutationFn: async (resolutions: Resolution<Activity>[]) => {
      if (!user) throw new Error('User not authenticated')
      await resolveActivityConflicts(resolutions, activityConflicts, user.id)
    },
  })

  return {
    compare: compareMutation.mutateAsync,
    isComparing: compareMutation.isPending,
    contactConflicts,
    dealConflicts,
    activityConflicts,
    resolveContacts: resolveContactsMutation.mutateAsync,
    resolveDeals: resolveDealsMutation.mutateAsync,
    resolveActivities: resolveActivitiesMutation.mutateAsync,
    isResolving: resolveContactsMutation.isPending || resolveDealsMutation.isPending || resolveActivitiesMutation.isPending,
  }
}
