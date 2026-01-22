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

      // Compare
      const contacts = compareContacts(supabaseContacts, sheetsContacts)
      const deals = compareDeals(supabaseDeals, sheetsDeals)
      const activities = compareActivities(supabaseActivities, sheetsActivities)

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
